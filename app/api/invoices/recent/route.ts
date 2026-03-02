import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  try {
    const limitRaw = new URL(req.url).searchParams.get('limit') || '12';
    const limit = Math.min(50, Math.max(1, parseInt(limitRaw)));

    const invoices = await prisma.invoice.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        payments: {
          select: { amount: true },
        },
      },
    });

    return successResponse({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        totalAmount: inv.totalAmount,
        state: inv.state,
        customerName: inv.customer?.name || 'Walk-in Customer',
        paidAmount: inv.payments.reduce((sum, p) => sum + p.amount, 0),
      })),
    });
  } finally {
    await prisma.$disconnect();
  }
}
