import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/app/lib/error-handler';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: true },
    });

    if (!dbUser || dbUser.role.name !== 'ADMIN') {
      return forbiddenResponse('Reports are available for admin only');
    }

    const now = new Date();
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = startDateParam ? new Date(startDateParam) : startOfMonth;
    const endDate = endDateParam ? new Date(endDateParam) : now;

    const [dailySale, monthlySale, topProducts, invoicesToday] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfDay }, state: { not: 'CANCELLED' } as any },
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startDate, lte: endDate },
          state: { not: 'CANCELLED' } as any,
        },
      }),
      prisma.invoiceItem.groupBy({
        by: ['productId'],
        _sum: { lineTotal: true, qty: true },
        where: {
          invoice: {
            createdAt: { gte: startDate, lte: endDate },
            state: { not: 'CANCELLED' } as any,
          },
        },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
      prisma.invoice.count({
        where: { createdAt: { gte: startOfDay, lte: now } },
      }),
    ]);

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, basePrice: true, costPrice: true },
    });

    const byId = new Map(products.map((p) => [p.id, p]));
    const topProductsWithName = topProducts.map((entry) => {
      const p = byId.get(entry.productId);
      const qty = entry._sum.qty ?? 0;
      const revenue = entry._sum.lineTotal ?? 0;
      const margin = (p?.basePrice ?? 0) - (p?.costPrice ?? 0);
      return {
        productId: entry.productId,
        name: p?.name || `Product #${entry.productId}`,
        revenue,
        qty,
        estimatedProfit: margin * qty,
      };
    });

    return successResponse({
      dailySale: dailySale._sum.totalAmount ?? 0,
      monthlySale: monthlySale._sum.totalAmount ?? 0,
      invoicesToday,
      topProducts: topProductsWithName,
      estimatedProfitToday: topProductsWithName.reduce(
        (sum, p) => sum + p.estimatedProfit,
        0
      ),
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
