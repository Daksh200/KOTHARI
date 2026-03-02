import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const rows = await prisma.inventoryItem.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });

    const data = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      name: row.product.name,
      sku: row.product.sku,
      category: row.product.category,
      in: null,
      out: null,
      balance: row.totalQuantity,
      alert: row.totalQuantity <= 5 ? 'LOW' : 'OK',
      location: row.location,
    }));

    return successResponse({ items: data });
  } finally {
    await prisma.$disconnect();
  }
}
