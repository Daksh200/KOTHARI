import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';

const prisma = new PrismaClient();

type DayBookEntry = {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  voucherNo: string;
  party: string;
  amount: number;
  mode?: string;
};

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: {
          invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const invoiceEntries: DayBookEntry[] = invoices.map((inv) => ({
      id: `I-${inv.id}`,
      date: inv.createdAt.toISOString(),
      type: 'INVOICE',
      voucherNo: inv.invoiceNumber,
      party: inv.customer?.name || 'Walk-in Customer',
      amount: inv.totalAmount,
    }));

    const paymentEntries: DayBookEntry[] = payments.map((p) => ({
      id: `P-${p.id}`,
      date: p.createdAt.toISOString(),
      type: 'PAYMENT',
      voucherNo: p.invoice?.invoiceNumber || `PAY-${p.id}`,
      party: p.invoice?.customer?.name || 'Walk-in Customer',
      amount: p.amount,
      mode: p.type,
    }));

    const entries = [...invoiceEntries, ...paymentEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return successResponse({
      date: start.toISOString().slice(0, 10),
      totalEntries: entries.length,
      totalInvoiceAmount: invoiceEntries.reduce((s, e) => s + e.amount, 0),
      totalPaymentAmount: paymentEntries.reduce((s, e) => s + e.amount, 0),
      entries,
    });
  } finally {
    await prisma.$disconnect();
  }
}
