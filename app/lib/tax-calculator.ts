/**
 * GST Tax Calculation Engine
 * Handles GST (5%, 12%, 18%, 28%) tax computations for invoices
 * Supports CGST/SGST (intra-state) and IGST (inter-state) split
 */

export interface TaxLine {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceItemTax {
  itemId: number;
  lineTaxable: number;
  taxRate: number;
  tax: TaxLine;
  lineTotal: number;
}

/**
 * Determine if transaction is intra-state (CGST+SGST) or inter-state (IGST)
 */
export function isIntraState(
  shopStateCode: string,
  customerGSTIN?: string
): boolean {
  if (!customerGSTIN || customerGSTIN.length < 2) return true; // default intra-state
  const customerStateCode = customerGSTIN.substring(0, 2);
  return shopStateCode === customerStateCode;
}

/**
 * Calculate tax for a single invoice item
 * @param unitPrice Price per unit
 * @param quantity Quantity or meters sold
 * @param discount Line-level discount amount
 * @param taxRate Tax rate percentage (5, 12, 18, 28)
 * @param intraState Whether transaction is intra-state (true = CGST+SGST, false = IGST)
 */
export function calculateItemTax(
  unitPrice: number,
  quantity: number,
  discount: number,
  taxRate: number,
  intraState: boolean
): InvoiceItemTax {
  const lineTaxable = unitPrice * quantity - discount;
  const taxAmount = (lineTaxable * taxRate) / 100;

  const tax: TaxLine = {
    cgst: intraState ? Math.round((taxAmount / 2) * 100) / 100 : 0,
    sgst: intraState ? Math.round((taxAmount / 2) * 100) / 100 : 0,
    igst: intraState ? 0 : Math.round(taxAmount * 100) / 100,
    total: Math.round(taxAmount * 100) / 100,
  };

  return {
    itemId: 0, // set by caller
    lineTaxable: Math.round(lineTaxable * 100) / 100,
    taxRate,
    tax,
    lineTotal: Math.round((lineTaxable + tax.total) * 100) / 100,
  };
}

/**
 * Calculate invoice-level tax breakdown
 */
export function calculateInvoiceTax(items: InvoiceItemTax[]): {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  finalAmount: number;
} {
  const taxableAmount = items.reduce((sum, item) => sum + item.lineTaxable, 0);
  const cgst = items.reduce((sum, item) => sum + item.tax.cgst, 0);
  const sgst = items.reduce((sum, item) => sum + item.tax.sgst, 0);
  const igst = items.reduce((sum, item) => sum + item.tax.igst, 0);
  const totalTax = cgst + sgst + igst;
  
  const subtotal = taxableAmount + totalTax;
  const roundOff = Math.round(subtotal) - subtotal;
  const finalAmount = Math.round(subtotal);

  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    roundOff: Math.round(roundOff * 100) / 100,
    finalAmount,
  };
}
