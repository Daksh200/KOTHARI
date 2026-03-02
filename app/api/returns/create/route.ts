/**
 * POST /api/returns/create
 * Create a return and process refund for invoice items
 * Handles:
 * - Return record creation
 * - Inventory restock (if applicable)
 * - Refund payment recording
 * - Tax reversal tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateRefundAmount } from '@/app/lib/payment-service';
import { StockMovementType } from '@/app/lib/inventory-service';

const prisma = new PrismaClient();

interface ReturnItemPayload {
  invoiceItemId: number;
  returnedQty: number;
  returnedMeters?: number;
  reason?: string;
  restock: boolean;
}

interface CreateReturnPayload {
  invoiceId: number;
  items: ReturnItemPayload[];
  userId: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateReturnPayload = await req.json();
    const { invoiceId, items, userId } = body;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      if (!['PAID', 'PARTIAL'].includes(invoice.state)) {
        return NextResponse.json(
          { error: 'Can only return items from paid/partial invoices' },
          { status: 400 }
        );
      }

      // 2. Create Return record
      const returnNumber = `RET-${Date.now()}`;
      const returnRecord = await tx.return.create({
        data: {
          invoiceId,
          returnNumber,
          processedById: userId,
          totalRefund: 0, // will update after calculating
          state: 'INITIATED',
        },
      });

      let totalRefund = 0;

      // 3. Process each return item
      for (const returnItem of items) {
        const invoiceItem = invoice.items.find((ii) => ii.id === returnItem.invoiceItemId);
        if (!invoiceItem) {
          throw new Error(`Invoice item ${returnItem.invoiceItemId} not found`);
        }

        // Calculate refund amount
        const refund = calculateRefundAmount(
          invoiceItem.lineTotal,
          returnItem.returnedQty,
          invoiceItem.qty || 1
        );

        totalRefund += refund.refundAmount;

        // Create ReturnItem record
        await tx.returnItem.create({
          data: {
            returnId: returnRecord.id,
            invoiceItemId: returnItem.invoiceItemId,
            productId: invoiceItem.productId,
            qty: returnItem.returnedQty,
            meters: returnItem.returnedMeters,
            reason: returnItem.reason,
            restock: returnItem.restock,
            refundAmount: refund.refundAmount,
          },
        });

        // 4. Handle inventory restock
        if (returnItem.restock) {
          const inventoryItem = await tx.inventoryItem.findFirst({
            where: {
              productId: invoiceItem.productId,
              variantId: invoiceItem.variantId,
            },
          });

          if (inventoryItem) {
            // Create restock transaction
            await tx.inventoryTransaction.create({
              data: {
                inventoryItemId: inventoryItem.id,
                type: StockMovementType.RETURN,
                changeQty: returnItem.returnedQty,
                changeMeters: returnItem.returnedMeters,
                referenceType: 'RETURN',
                referenceId: returnRecord.id,
                performedById: userId,
                note: `Restock from return RET-${returnRecord.id}`,
              },
            });

            // Update inventory
            await tx.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                totalQuantity:
                  inventoryItem.totalQuantity + returnItem.returnedQty,
                rollRemainingMeters: inventoryItem.rollRemainingMeters
                  ? inventoryItem.rollRemainingMeters + (returnItem.returnedMeters || 0)
                  : undefined,
                lastStockAt: new Date(),
              },
            });
          }
        }
      }

      // 5. Create refund payment
      await tx.payment.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          type: 'REFUND',
          amount: totalRefund,
          notes: `Refund for return ${returnRecord.returnNumber}`,
          createdById: userId,
          status: 'COMPLETED',
        },
      });

      // 6. Update return total
      const updatedReturn = await tx.return.update({
        where: { id: returnRecord.id },
        data: {
          totalRefund,
          state: 'COMPLETED',
        },
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RETURN',
          entityId: updatedReturn.id,
          action: 'CREATED',
          performedById: userId,
          meta: {
            invoiceId,
            refundAmount: totalRefund,
            itemsReturned: items.length,
            restockItems: items.filter((i) => i.restock).length,
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          return: updatedReturn,
          refundAmount: totalRefund,
        },
        { status: 201 }
      );
    });
  } catch (error: any) {
    console.error('Return creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create return' },
      { status: 500 }
    );
  }
}
