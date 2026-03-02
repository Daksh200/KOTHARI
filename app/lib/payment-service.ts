/**
 * Payment Service
 * Handles invoice payments, advance payments, allocations, and refunds
 */

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK = 'BANK',
  ADVANCE = 'ADVANCE',
  REFUND = 'REFUND',
}

export interface Payment {
  id?: number;
  invoiceId?: number;
  customerId?: number;
  type: PaymentMode;
  amount: number;
  instrumentRef?: string; // UPI/Card/Cheque reference
  notes?: string;
  createdById?: number;
}

export interface AdvancePaymentRecord {
  id?: number;
  customerId: number;
  amount: number;
  allocatedAmount: number;
  remainingAmount: number;
  notes?: string;
}

/**
 * Calculate payment state for an invoice
 */
export function calculateInvoicePaymentState(
  totalAmount: number,
  totalPaidAmount: number
): 'DRAFT' | 'PARTIAL' | 'PAID' | 'OVERPAID' {
  if (totalPaidAmount === 0) return 'DRAFT';
  if (totalPaidAmount < totalAmount) return 'PARTIAL';
  if (totalPaidAmount === totalAmount) return 'PAID';
  return 'OVERPAID';
}

/**
 * Allocate advance payment to invoice
 * Returns remaining advance and amount allocated
 */
export function allocateAdvancePayment(
  advance: AdvancePaymentRecord,
  invoiceAmount: number
): {
  amountToAllocate: number;
  remainingAdvance: number;
  remainingInvoiceAmount: number;
} {
  const available = advance.remainingAmount;
  const amountToAllocate = Math.min(available, invoiceAmount);
  
  return {
    amountToAllocate: Math.round(amountToAllocate * 100) / 100,
    remainingAdvance: Math.round((available - amountToAllocate) * 100) / 100,
    remainingInvoiceAmount: Math.round((invoiceAmount - amountToAllocate) * 100) / 100,
  };
}

/**
 * Calculate refund amount for returned items
 */
export function calculateRefundAmount(
  originalLineTotal: number,
  returnedQty: number,
  originalQty: number,
  includeDiscount: boolean = true,
  discountAmount: number = 0
): {
  refundAmount: number;
  refundTax: number;
  refundTotal: number;
} {
  const lineAmountPerUnit = originalLineTotal / originalQty;
  const refundLineAmount = lineAmountPerUnit * returnedQty;
  
  // For GST items, refund is typically the full line amount including tax
  // For refund calculations involving discounts, apply proportionally
  const appliedDiscount = includeDiscount ? (discountAmount / originalQty) * returnedQty : 0;
  const refundAmount = Math.round((refundLineAmount - appliedDiscount) * 100) / 100;

  return {
    refundAmount,
    refundTax: 0, // calculated by tax calculator if needed
    refundTotal: refundAmount,
  };
}

/**
 * Validate payment combination (cash, card, UPI, advance, etc.)
 */
export function validatePaymentCombo(
  totalAmount: number,
  payments: Payment[]
): {
  valid: boolean;
  totalPaid: number;
  shortfall: number;
  errors: string[];
} {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const shortfall = Math.max(0, totalAmount - totalPaid);

  const errors: string[] = [];

  for (const payment of payments) {
    if (payment.amount <= 0) {
      errors.push(`Payment amount must be > 0`);
    }
    if (payment.type === PaymentMode.UPI && !payment.instrumentRef) {
      errors.push('UPI payment requires transaction ID');
    }
    if (payment.type === PaymentMode.CARD && !payment.instrumentRef) {
      errors.push('Card payment requires card reference');
    }
  }

  return {
    valid: errors.length === 0 && shortfall === 0,
    totalPaid: Math.round(totalPaid * 100) / 100,
    shortfall: Math.round(shortfall * 100) / 100,
    errors,
  };
}
