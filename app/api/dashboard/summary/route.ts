import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, lowStockCount, totalProducts] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfDay }, state: { not: 'CANCELLED' } as any },
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfMonth }, state: { not: 'CANCELLED' } as any },
      }),
      prisma.inventoryItem.count({
        where: { totalQuantity: { lte: 5 } },
      }),
      prisma.product.count({
        where: { isActive: true },
      }),
    ]);

    return successResponse({
      todaySales: todayAgg._sum.totalAmount ?? 0,
      monthSales: monthAgg._sum.totalAmount ?? 0,
      lowStockItems: lowStockCount,
      totalItems: totalProducts,
    });
  } finally {
    await prisma.$disconnect();
  }
}
