/**
 * POST /api/invoices/:id/print
 * Generate ESC/POS bytes for an invoice and send to configured printer (or save locally)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, unauthorized } from '@/app/lib/auth-middleware';
import { generateInvoiceESCPOS, InvoicePrintData } from '@/app/lib/print-service';
import fs from 'fs/promises';
import path from 'path';
import net from 'net';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const invoiceId = parseInt(id);

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { items: { include: { product: true } }, customer: true, payments: true },
    });

    // Load store settings (if present)
    const settings = await prisma.setting.findUnique({ where: { key: 'store_details' } });
    const storeDetails = (settings?.value as any) || {
      name: 'Furnish Shop',
      gstin: '27AABCT1234H1Z0',
      address: 'Unknown',
      phone: '',
    };

    const printData: InvoicePrintData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt,
      storeDetails,
      customerDetails: invoice.customer
        ? {
            name: invoice.customer.name,
            phone: invoice.customer.phone || undefined,
            gstin: invoice.customer.gstin || undefined,
            address: invoice.customer.address || undefined,
          }
        : { name: 'Walk-in Customer' },
      items: invoice.items.map((item) => ({
        description: item.product?.name || item.description || 'Item',
        qty: item.qty || 1,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        cgst: item.cgst || 0,
        sgst: item.sgst || 0,
        igst: item.igst || 0,
        lineTotal: item.lineTotal,
      })),
      totals: {
        taxableAmount: invoice.taxableAmount || 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: invoice.totalTax || 0,
        roundOff: invoice.roundOff || 0,
        finalAmount: invoice.totalAmount || 0,
      },
      payments: invoice.payments.map((p) => ({ mode: p.type, amount: p.amount })),
      invoiceType: (invoice.type as any) || 'NON_GST',
    };

    // Sum GST components from items
    for (const it of printData.items) {
      printData.totals.cgst += it.cgst;
      printData.totals.sgst += it.sgst;
      printData.totals.igst += it.igst;
    }

    const escposBuffer = generateInvoiceESCPOS(printData, 'narrow');

    // If TCP printer config present, attempt to send buffer to printer
    const printerHost = process.env.PRINTER_TCP_HOST;
    const printerPort = process.env.PRINTER_TCP_PORT ? parseInt(process.env.PRINTER_TCP_PORT) : undefined;

    if (printerHost && printerPort) {
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        socket.connect(printerPort, printerHost, () => {
          socket.write(escposBuffer, () => {
            socket.end();
            resolve();
          });
        });
      });

      return NextResponse.json({ success: true, printed: true });
    }

    // Otherwise, save to local prints directory for manual retrieval (dry-run)
    const printsDir = path.join(process.cwd(), '.prints');
    await fs.mkdir(printsDir, { recursive: true });
    const filePath = path.join(printsDir, `invoice-${invoice.invoiceNumber || invoiceId}.escpos`);
    await fs.writeFile(filePath, escposBuffer);

    return NextResponse.json({ success: true, printed: false, savedPath: filePath });
  } catch (err: any) {
    console.error('Print error:', err);
    return NextResponse.json({ error: 'Failed to print invoice' }, { status: 500 });
  }
}
