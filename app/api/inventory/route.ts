import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { InventoryStockInSchema } from '@/app/lib/schemas';
import { successResponse, validationErrorResponse, NotFoundError } from '@/app/lib/error-handler';
import { withErrorHandling, extractAuthUser } from '@/app/lib/validation';
import { requireRole } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

/**
 * POST /api/inventory/stock-in
 * Record stock received from supplier (Purchase Order fulfillment)
 * Requires: ADMIN role
 * 
 * Creates:
 * - InventoryTransaction (audit trail)
 * - Updates InventoryItem quantity
 * - Creates PurchaseItem record
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  // Check role
  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) {
    const { forbiddenResponse } = require('@/app/lib/error-handler');
    return forbiddenResponse('Only administrators can manage inventory');
  }

  // Validate request
  const body = await req.json();
  const validation = InventoryStockInSchema.safeParse(body);

  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid stock-in data', details);
  }

  const data = validation.data;

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Get current inventory
    const inventory = await prisma.inventoryItem.findFirst({
      where: { productId: data.productId },
    });

    if (!inventory) {
      throw new NotFoundError('Inventory record not found for product');
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: inventory.totalQuantity + data.quantity,
          rollRemainingMeters: (inventory.rollRemainingMeters || 0) + (data.meters || 0),
          lastStockAt: new Date(),
        },
      });

      // Create audit trail transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'IN',
          changeQty: data.quantity,
          changeMeters: data.meters ?? undefined,
          referenceType: data.poNumber ? 'PO' : 'MANUAL',
          // purchaseOrderId is not part of schema, store the PO number as note if needed
          note: data.notes || data.poNumber,
          performedById: user.userId,
        },
      });

      // NOTE: purchase order item creation was removed; handle PO records elsewhere if required.

      return { updatedInventory, transaction };
    });

    return successResponse(
      {
        inventory: result.updatedInventory,
        transaction: result.transaction,
      },
      'Stock received successfully',
      201
    );
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
});
