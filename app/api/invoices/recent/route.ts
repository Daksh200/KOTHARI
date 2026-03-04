import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';
import { isDemoMode } from '@/app/lib/demo-auth';

const prisma = new PrismaClient();

// Demo recent invoices for demonstration
const DEMO_INVOICES = [
  { id: 1, invoiceNumber: 'INV-2024-001', createdAt: new Date(), totalAmount: 15000, state: 'FINALIZED', customerName: 'John Doe', paidAmount: 15000 },
  { id: 2, invoiceNumber: 'INV-2024-002', createdAt: new Date(), totalAmount: 8500, state: 'FINALIZED', customerName: 'Jane Smith', paidAmount: 8500 },
  { id: 3, invoiceNumber: 'INV-2024-003', createdAt: new Date(), totalAmount: 25000, state: 'FINALIZED', customerName: 'Raj Patel', paidAmount: 12500 },
  { id: 4, invoiceNumber: 'INV-2024-004', createdAt: new Date(), totalAmount: 4500, state: 'DRAFT', customerName: 'Amit Kumar', paidAmount: 0 },
  { id: 5, invoiceNumber: 'INV-2024-005', createdAt: new Date(), totalAmount: 12000, state: 'FINALIZED', customerName: 'Suresh Iyer', paidAmount: 12000 },
];

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  // Return demo invoices in demo mode
  if (isDemoMode()) {
    return successResponse({
      invoices: DEMO_INVOICES,
    });
  }

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
