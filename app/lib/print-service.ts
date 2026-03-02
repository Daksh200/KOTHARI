/**
 * Invoice Printing Service
 * Generates PDF and ESC/POS (thermal printer) formats for invoices
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface InvoicePrintData {
  invoiceNumber: string;
  invoiceDate: Date;
  storeDetails: {
    name: string;
    gstin: string;
    address: string;
    phone: string;
  };
  customerDetails: {
    name: string;
    phone?: string;
    gstin?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    discount: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }>;
  totals: {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    roundOff: number;
    finalAmount: number;
  };
  payments: Array<{
    mode: string;
    amount: number;
  }>;
  invoiceType: 'GST' | 'NON_GST';
}

/**
 * Generate PDF invoice
 * Returns a Buffer containing the PDF
 */
export async function generateInvoicePDF(
  data: InvoicePrintData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(data.storeDetails.name, { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`GSTIN: ${data.storeDetails.gstin}`, { align: 'center' });
    doc
      .fontSize(9)
      .text(data.storeDetails.address, { align: 'center' });
    doc.text(`Phone: ${data.storeDetails.phone}`, { align: 'center' });

    doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();

    // Invoice details
    doc.fontSize(12).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.y += 10;

    doc.font('Helvetica').fontSize(10);
    const details = [
      `Invoice #: ${data.invoiceNumber}`,
      `Date: ${data.invoiceDate.toLocaleDateString('en-IN')}`,
      `Type: ${data.invoiceType}`,
    ];

    let detailY = doc.y;
    for (let i = 0; i < details.length; i++) {
      if (i === 0) doc.text(details[i], 60, detailY);
      if (i === 1) doc.text(details[i], 250, detailY);
      if (i === 2) doc.text(details[i], 440, detailY);
    }
    doc.y = detailY + 20;

    // Bill To / Ship To
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:');
    doc.font('Helvetica').fontSize(9);
    doc.text(data.customerDetails.name);
    if (data.customerDetails.gstin) doc.text(`GSTIN: ${data.customerDetails.gstin}`);
    if (data.customerDetails.address) doc.text(data.customerDetails.address);
    if (data.customerDetails.phone) doc.text(`Phone: ${data.customerDetails.phone}`);

    doc.y += 10;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.y += 5;

    // Table headers
    const columns = {
      description: 60,
      qty: 280,
      unitPrice: 350,
      discount: 410,
      taxable: 470,
      gst: 520,
    };

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Description', columns.description);
    doc.text('Qty', columns.qty, doc.y - 15);
    doc.text('Unit Price', columns.unitPrice, doc.y);
    doc.text('Disc', columns.discount, doc.y);
    doc.text('Taxable', columns.taxable, doc.y);
    doc.text('GST %', columns.gst, doc.y);

    doc.y += 15;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.y += 5;

    // Table rows
    doc.font('Helvetica').fontSize(9);
    for (const item of data.items) {
      const taxableAmount = item.qty * item.unitPrice - item.discount;
      const gstPercent = item.cgst ? item.cgst * 2 : item.igst;

      doc.text(item.description.substring(0, 20), columns.description);
      doc.text(item.qty.toFixed(2), columns.qty, doc.y - 15);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, columns.unitPrice, doc.y);
      doc.text(`₹${item.discount.toFixed(2)}`, columns.discount, doc.y);
      doc.text(`₹${taxableAmount.toFixed(2)}`, columns.taxable, doc.y);
      doc.text(`${gstPercent.toFixed(1)}%`, columns.gst, doc.y);
      doc.y += 15;
    }

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.y += 10;

    // Totals
    const totalsX = 400;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`Taxable Amount:`, 300, doc.y);
    doc.text(`₹${data.totals.taxableAmount.toFixed(2)}`, totalsX, doc.y, { align: 'right' });

    if (data.totals.cgst > 0) {
      doc.y += 15;
      doc.text(`CGST (50%):`, 300, doc.y);
      doc.text(`₹${data.totals.cgst.toFixed(2)}`, totalsX, doc.y, { align: 'right' });
    }

    if (data.totals.sgst > 0) {
      doc.y += 15;
      doc.text(`SGST (50%):`, 300, doc.y);
      doc.text(`₹${data.totals.sgst.toFixed(2)}`, totalsX, doc.y, { align: 'right' });
    }

    if (data.totals.igst > 0) {
      doc.y += 15;
      doc.text(`IGST:`, 300, doc.y);
      doc.text(`₹${data.totals.igst.toFixed(2)}`, totalsX, doc.y, { align: 'right' });
    }

    if (data.totals.roundOff !== 0) {
      doc.y += 15;
      doc.text(`Round Off:`, 300, doc.y);
      doc.text(`₹${data.totals.roundOff.toFixed(2)}`, totalsX, doc.y, { align: 'right' });
    }

    doc.y += 15;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`TOTAL:`, 300, doc.y);
    doc.text(`₹${data.totals.finalAmount.toFixed(2)}`, totalsX, doc.y, { align: 'right' });

    // Payments
    doc.y += 20;
    doc.font('Helvetica-Bold').fontSize(10).text('Payments:');
    doc.font('Helvetica').fontSize(9);
    for (const payment of data.payments) {
      doc.text(`${payment.mode}: ₹${payment.amount.toFixed(2)}`);
    }

    // Footer
    doc.y += 20;
    doc.font('Helvetica').fontSize(8);
    doc.text('This is a computer-generated invoice. No signature required.', { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate ESC/POS format for thermal printer (58mm or 80mm)
 * Returns a Buffer with ESC/POS commands
 */
export function generateInvoiceESCPOS(
  data: InvoicePrintData,
  paperWidth: 'narrow' | 'wide' = 'narrow'
): Buffer {
  const commands: Buffer[] = [];

  // Helper function to add text
  function addText(text: string, bold = false, center = false): void {
    if (bold) commands.push(Buffer.from('\x1b\x45\x01')); // Bold on
    if (center) commands.push(Buffer.from('\x1b\x61\x01')); // Center align
    commands.push(Buffer.from(text + '\n'));
    if (bold) commands.push(Buffer.from('\x1b\x45\x00')); // Bold off
    if (center) commands.push(Buffer.from('\x1b\x61\x00')); // Left align
  }

  // Initialize
  commands.push(Buffer.from('\x1b\x40')); // Initialize
  commands.push(Buffer.from('\x1b\x61\x01')); // Center align

  // Header
  addText(data.storeDetails.name, true, true);
  addText(data.storeDetails.gstin, false, true);
  addText(data.storeDetails.phone, false, true);

  commands.push(Buffer.from('\x1b\x61\x00')); // Left align
  addText('-'.repeat(40));

  // Invoice details
  addText(`Invoice: ${data.invoiceNumber}`);
  addText(`Date: ${data.invoiceDate.toLocaleDateString('en-IN')}`);
  addText(`Type: ${data.invoiceType}`);
  addText('-'.repeat(40));

  // Customer
  addText('Bill To:');
  addText(data.customerDetails.name);
  if (data.customerDetails.gstin) addText(`GSTIN: ${data.customerDetails.gstin}`);

  addText('-'.repeat(40));

  // Items header
  addText(`Item${' '.repeat(23)}Qty Price Tax Amount`, true);
  addText('-'.repeat(40));

  // Items
  for (const item of data.items) {
    const desc = item.description.substring(0, 12).padEnd(12);
    const qty = item.qty.toFixed(1).padStart(4);
    const price = item.unitPrice.toFixed(0).padStart(6);
    const amount = item.lineTotal.toFixed(2).padStart(8);
    addText(`${desc}${qty}${price}${amount}`);
  }

  addText('-'.repeat(40));

  // Totals
  commands.push(Buffer.from('\x1b\x61\x02')); // Right align
  addText(`Taxable: ₹${data.totals.taxableAmount.toFixed(2)}`);
  if (data.totals.cgst > 0) addText(`CGST: ₹${data.totals.cgst.toFixed(2)}`);
  if (data.totals.sgst > 0) addText(`SGST: ₹${data.totals.sgst.toFixed(2)}`);
  if (data.totals.igst > 0) addText(`IGST: ₹${data.totals.igst.toFixed(2)}`);
  addText(`Total: ₹${data.totals.finalAmount.toFixed(2)}`, true);

  commands.push(Buffer.from('\x1b\x61\x00')); // Left align
  addText('-'.repeat(40));

  // Payments
  addText('Payments:');
  for (const payment of data.payments) {
    addText(`${payment.mode}: ₹${payment.amount.toFixed(2)}`);
  }

  // Footer
  addText('Thank you!', false, true);
  addText(new Date().toLocaleString('en-IN'), false, true);

  // Cut paper
  commands.push(Buffer.from('\x1d\x56\x00')); // Partial cut

  // Feed lines
  commands.push(Buffer.from('\n\n\n'));

  return Buffer.concat(commands);
}
