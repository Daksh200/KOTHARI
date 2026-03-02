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
  if (!isAdmin) return forbiddenResponse('Only admin can adjust stock');

  try {
    const body = await req.json();
    const productId = Number(body.productId);
    const adjustment = Number(body.adjustmentQty);
    const note = (body.note || body.reason || '').toString();

    if (!Number.isFinite(productId) || productId <= 0) {
      return validationErrorResponse('Invalid productId');
    }
    if (!Number.isFinite(adjustment) || adjustment === 0) {
      return validationErrorResponse('Adjustment quantity cannot be zero');
    }

    const inventory = await prisma.inventoryItem.findFirst({ where: { productId } });
    if (!inventory) return notFoundResponse('Inventory not found for product');

    const finalQty = inventory.totalQuantity + adjustment;
    if (finalQty < 0) {
      return errorResponse(
        400,
        `Adjustment would make stock negative (${finalQty})`,
        'INVALID_ADJUSTMENT'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: finalQty,
          lastStockAt: new Date(),
        },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'ADJUSTMENT',
          changeQty: adjustment,
          note: note || 'Manual adjustment',
          performedById: session.userId,
          referenceType: 'MANUAL',
        },
      });

      return { updated, transaction };
    });

    return successResponse(result, 'Inventory adjusted', 201);
  } finally {
    await prisma.$disconnect();
  }
}
