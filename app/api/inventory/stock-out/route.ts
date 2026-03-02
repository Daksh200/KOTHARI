import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  notFoundResponse,
  errorResponse,
} from '@/app/lib/error-handler';
import { requireAuth, requireRole } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) return forbiddenResponse('Only admin can do stock out');

  try {
    const body = await req.json();
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    const note = (body.note || '').toString();

    if (!Number.isFinite(productId) || productId <= 0) {
      return validationErrorResponse('Invalid productId');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return validationErrorResponse('Quantity must be greater than 0');
    }

    const inventory = await prisma.inventoryItem.findFirst({ where: { productId } });
    if (!inventory) return notFoundResponse('Inventory not found for product');
    if (inventory.totalQuantity < quantity) {
      return errorResponse(
        400,
        `Insufficient stock. Available ${inventory.totalQuantity}, requested ${quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: inventory.totalQuantity - quantity,
          lastStockAt: new Date(),
        },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'OUT',
          changeQty: -quantity,
          note: note || 'Manual stock out',
          performedById: session.userId,
          referenceType: 'MANUAL',
        },
      });

      return { updated, transaction };
    });

    return successResponse(result, 'Stock out recorded', 201);
  } finally {
    await prisma.$disconnect();
  }
}
