import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';
import { isDemoMode } from '@/app/lib/demo-auth';

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

// Demo daybook entries for demonstration
const DEMO_ENTRIES: DayBookEntry[] = [
  { id: 'I-1', date: new Date().toISOString(), type: 'INVOICE', voucherNo: 'INV-2024-001', party: 'John Doe', amount: 15000 },
  { id: 'I-2', date: new Date().toISOString(), type: 'INVOICE', voucherNo: 'INV-2024-002', party: 'Jane Smith', amount: 8500 },
  { id: 'P-1', date: new Date().toISOString(), type: 'PAYMENT', voucherNo: 'INV-2024-001', party: 'John Doe', amount: 15000, mode: 'CASH' },
  { id: 'I-3', date: new Date().toISOString(), type: 'INVOICE', voucherNo: 'INV-2024-003', party: 'Raj Patel', amount: 25000 },
  { id: 'P-2', date: new Date().toISOString(), type: 'PAYMENT', voucherNo: 'INV-2024-002', party: 'Jane Smith', amount: 8500, mode: 'UPI' },
];

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorizedResponse();

  // Return demo daybook in demo mode
  if (isDemoMode()) {
    const totalInvoiceAmount = DEMO_ENTRIES.filter(e => e.type === 'INVOICE').reduce((s, e) => s + e.amount, 0);
    const totalPaymentAmount = DEMO_ENTRIES.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + e.amount, 0);
    
    return successResponse({
      date: new Date().toISOString().slice(0, 10),
      totalEntries: DEMO_ENTRIES.length,
      totalInvoiceAmount,
      totalPaymentAmount,
      entries: DEMO_ENTRIES,
    });
  }

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
