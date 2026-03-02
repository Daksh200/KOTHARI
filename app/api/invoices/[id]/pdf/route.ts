/**
 * POST /api/invoices/:id/pdf
 * Generate and download PDF for an invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, unauthorized } from '@/app/lib/auth-middleware';
import { generateInvoicePDF, InvoicePrintData } from '@/app/lib/print-service';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await requireAuth(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const invoiceId = parseInt(id);

    // Fetch invoice with all details
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
      },
    });

    // Fetch store details from settings
    const settings = await prisma.setting.findUnique({
      where: { key: 'store_details' },
    });

    const storeDetails = settings?.value as any || {
      name: 'Furnish Shop',
      gstin: '27AABCT1234H1Z0',
      address: 'Mumbai, India',
      phone: '+91-XXXXXXXXXX',
    };

    // Build print data
    const printData: InvoicePrintData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt,
      storeDetails,
      customerDetails: invoice.customer ? {
        name: invoice.customer.name,
        phone: invoice.customer.phone || undefined,
        gstin: invoice.customer.gstin || undefined,
        address: invoice.customer.address || undefined,
      } : {
        name: 'Walk-in Customer',
      },
      items: invoice.items.map((item) => ({
        description: item.product.name,
        qty: item.qty || 1,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        cgst: item.cgst || 0,
        sgst: item.sgst || 0,
        igst: item.igst || 0,
        lineTotal: item.lineTotal,
      })),
      totals: {
        taxableAmount: invoice.taxableAmount,
        cgst: 0, // Calculate from items
        sgst: 0,
        igst: 0,
        totalTax: invoice.totalTax,
        roundOff: invoice.roundOff,
        finalAmount: invoice.totalAmount,
      },
      payments: invoice.payments.map((p) => ({
        mode: p.type,
        amount: p.amount,
      })),
      invoiceType: invoice.type as 'GST' | 'NON_GST',
    };

    // Calculate GST totals
    for (const item of printData.items) {
      printData.totals.cgst += item.cgst;
      printData.totals.sgst += item.sgst;
      printData.totals.igst += item.igst;
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(printData);

    // Return PDF
    // cast to any so TypeScript accepts the Node Buffer as BodyInit
    const response = new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
