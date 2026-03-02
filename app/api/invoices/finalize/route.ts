import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, PaymentType, InvoiceState } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

interface CartItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxableAmount?: number;
  tax?: number;
  lineTotal?: number;
}

interface PaymentInput {
  mode: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'ADVANCE';
  amount: number;
  reference?: string;
}

interface FinalizePayload {
  items: CartItemInput[];
  customerId?: number | null;
  payments?: PaymentInput[];
  discount?: number;
}

function createInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}${d}-${rand}`;
}

function toPaymentType(mode: PaymentInput['mode']): PaymentType {
  switch (mode) {
    case 'CARD':
      return PaymentType.CARD;
    case 'UPI':
      return PaymentType.UPI;
    case 'BANK':
      return PaymentType.BANK;
    case 'ADVANCE':
      return PaymentType.ADVANCE;
    default:
      return PaymentType.CASH;
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: FinalizePayload = await req.json();
    const items = body.items || [];
    const payments = body.payments || [];
    const customerId = body.customerId || null;
    const invoiceDiscount = Number(body.discount || 0);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true,
        name: true,
        taxRateId: true,
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      if (!productById.has(item.productId)) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found or inactive` },
          { status: 400 }
        );
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Invalid quantity in cart items' },
          { status: 400 }
        );
      }
    }

    const computedItems = items.map((item) => {
      const discount = Number(item.discount || 0);
      const taxableAmount = Number(
        item.taxableAmount ?? item.quantity * item.unitPrice - discount
      );
      const tax = Number(item.tax ?? taxableAmount * (Number(item.taxRate || 0) / 100));
      const lineTotal = Number(item.lineTotal ?? taxableAmount + tax);
      return {
        ...item,
        discount,
        taxableAmount,
        tax,
        lineTotal,
      };
    });

    const subtotal = computedItems.reduce((sum, i) => sum + i.taxableAmount, 0);
    const totalTax = computedItems.reduce((sum, i) => sum + i.tax, 0);
    const totalAmount = Math.max(0, subtotal + totalTax - invoiceDiscount);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const state =
      totalPaid >= totalAmount
        ? InvoiceState.PAID
        : totalPaid > 0
        ? InvoiceState.PARTIAL
        : InvoiceState.DRAFT;

    const invoiceNumber = createInvoiceNumber();

    const created = await prisma.$transaction(async (tx) => {
      const inventoryRows = await tx.inventoryItem.findMany({
        where: { productId: { in: productIds } },
        orderBy: { id: 'asc' },
      });
      const inventoryByProduct = new Map(
        inventoryRows.map((inv) => [inv.productId, inv])
      );

      for (const item of computedItems) {
        const inventory = inventoryByProduct.get(item.productId);
        if (!inventory) {
          throw new Error(`Inventory missing for product ${item.productId}`);
        }
        if (inventory.totalQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.productId}. Available ${inventory.totalQuantity}, required ${item.quantity}`
          );
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          type: 'GST',
          state,
          taxableAmount: subtotal,
          totalTax,
          totalAmount,
          roundOff: 0,
          issuedById: session.userId,
        },
      });

      for (const item of computedItems) {
        const product = productById.get(item.productId)!;
        const cgst = item.tax / 2;
        const sgst = item.tax / 2;

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: item.productId,
            qty: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRateId: product.taxRateId ?? null,
            cgst,
            sgst,
            igst: 0,
            lineTotal: item.lineTotal,
          },
        });

        const inventory = inventoryByProduct.get(item.productId)!;
        const newQty = inventory.totalQuantity - item.quantity;
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { totalQuantity: newQty, lastStockAt: new Date() },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: inventory.id,
            type: 'SALE',
            changeQty: -item.quantity,
            referenceType: 'INVOICE',
            referenceId: invoice.id,
            performedById: session.userId,
            note: `Sale ${invoice.invoiceNumber}`,
          },
        });
      }

      for (const payment of payments) {
        if (!Number.isFinite(payment.amount) || payment.amount <= 0) continue;
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            type: toPaymentType(payment.mode),
            amount: Number(payment.amount),
            instrumentRef: payment.reference || null,
            createdById: session.userId,
            status: 'COMPLETED',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: 'INVOICE',
          entityId: invoice.id,
          action: 'FINALIZED',
          performedById: session.userId,
          meta: {
            invoiceNumber: invoice.invoiceNumber,
            items: computedItems.length,
            totalAmount,
            paid: totalPaid,
          },
        },
      });

      return invoice;
    });

    return NextResponse.json(
      {
        success: true,
        id: created.id,
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to finalize invoice' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
