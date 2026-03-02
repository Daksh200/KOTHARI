import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  InventoryStockInSchema,
  InventoryStockOutSchema,
  InventoryAdjustmentSchema,
} from '@/app/lib/schemas';
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

/**
 * POST /api/inventory/stock-out
 * Record stock going out (damage, loss, returns, samples)
 * Requires: ADMIN role
 * 
 * Creates audit trail and updates inventory
 */
export async function stockOut(req: NextRequest) {
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
  const validation = InventoryStockOutSchema.safeParse(body);

  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid stock-out data', details);
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

    // Get current inventory
    const inventory = await prisma.inventoryItem.findFirst({
      where: { productId: data.productId },
    });

    if (!inventory) {
      throw new NotFoundError('Inventory record not found');
    }

    // Check sufficient stock
    if (inventory.totalQuantity < data.quantity) {
      const { errorResponse } = require('@/app/lib/error-handler');
      return errorResponse(
        400,
        `Insufficient stock. Available: ${inventory.totalQuantity}, Requested: ${data.quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory (decrease)
      const updatedInventory = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: inventory.totalQuantity - data.quantity,
          rollRemainingMeters: (inventory.rollRemainingMeters || 0) - (data.meters || 0),
        },
      });

      // Create audit trail with reason
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'OUT',
          changeQty: -data.quantity,
          changeMeters: data.meters ? -data.meters : undefined,
          referenceType: data.reason,
          note: data.notes,
          performedById: user.userId,
        },
      });

      return { updatedInventory, transaction };
    });

    return successResponse(
      {
        inventory: result.updatedInventory,
        transaction: result.transaction,
      },
      `Stock ${data.reason} recorded successfully`,
      201
    );
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/inventory/adjustment
 * Manual inventory adjustment (stock counting, corrections)
 * Requires: ADMIN role
 * 
 * This creates an ADJUSTMENT transaction for audit trail
 */
export async function adjustment(req: NextRequest) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  // Check role
  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) {
    const { forbiddenResponse } = require('@/app/lib/error-handler');
    return forbiddenResponse('Only administrators can adjust inventory');
  }

  // Validate request
  const body = await req.json();
  const validation = InventoryAdjustmentSchema.safeParse(body);

  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid adjustment data', details);
  }

  const data = validation.data;

  try {
    // Get current inventory
    const inventory = await prisma.inventoryItem.findFirst({
      where: { productId: data.productId },
    });

    if (!inventory) {
      throw new NotFoundError('Inventory record not found');
    }

    // Calculate new quantities
    const newQuantity = inventory.totalQuantity + data.adjustmentQty;
    const newMeters = (inventory.rollRemainingMeters || 0) + (data.adjustmentMeters || 0);

    if (newQuantity < 0 || newMeters < 0) {
      const { errorResponse } = require('@/app/lib/error-handler');
      return errorResponse(
        400,
        'Adjustment would result in negative inventory',
        'INVALID_ADJUSTMENT'
      );
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: newQuantity,
          rollRemainingMeters: newMeters,
        },
      });

      // Create audit trail (ADJUSTMENT type)
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'ADJUSTMENT',
          changeQty: data.adjustmentQty,
          changeMeters: data.adjustmentMeters,
          referenceType: 'ADJUSTMENT',
          note: data.reason,
          performedById: user.userId,
        },
      });

      return { updatedInventory, transaction };
    });

    return successResponse(
      {
        inventory: result.updatedInventory,
        transaction: result.transaction,
      },
      'Inventory adjusted successfully',
      201
    );
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
