import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/app/lib/error-handler';
import { requireAuth, requireRole } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) return forbiddenResponse('Only admin can do stock in');

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

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: inventory.totalQuantity + quantity,
          lastStockAt: new Date(),
        },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventory.id,
          type: 'IN',
          changeQty: quantity,
          note: note || 'Manual stock in',
          performedById: session.userId,
          referenceType: 'MANUAL',
        },
      });

      return { updated, transaction };
    });

    return successResponse(result, 'Stock in recorded', 201);
  } finally {
    await prisma.$disconnect();
  }
}
