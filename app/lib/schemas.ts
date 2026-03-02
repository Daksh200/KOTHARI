import { z } from 'zod';
import { Unit, InvoiceState, PaymentType, InvoiceType } from '@prisma/client';

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const StringIdSchema = z.coerce.number().int().positive('ID must be positive integer');
export const PhoneSchema = z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits');
export const GSTINSchema = z.string().regex(/^[0-9A-Z]{15}$/, 'Invalid GSTIN format');
export const EmailSchema = z.string().email('Invalid email format');
export const PincodeSchema = z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits');

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const CreateProductSchema = z.object({
  name: z.string().min(3, 'Product name required').max(100),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().min(1, 'SKU required').max(50),
  category: z.string().optional(),
  unit: z.enum(['PIECE', 'METER', 'ROLL']).default('PIECE'),
  basePrice: z.number().positive('Base price must be positive'),
  costPrice: z.number().nonnegative('Cost price must be non-negative').optional(),
  taxRateId: z.coerce.number().int().positive('Tax rate required'),
  reorderLevel: z.number().nonnegative('Reorder level must be non-negative').default(10),
  isMeterBased: z.boolean().default(false),
  supplierId: z.coerce.number().int().positive('Supplier required'),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ProductSearchSchema = z.object({
  query: z.string().min(1, 'Search query required').max(100),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  includeOutOfStock: z.boolean().default(false),
});

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductSchema>; // UpdateProductSchema already partial
export type ProductSearchRequest = z.infer<typeof ProductSearchSchema>;

// ============================================================================
// PRODUCT VARIANT SCHEMAS
// ============================================================================

export const CreateProductVariantSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantName: z.string().min(1, 'Variant name required').max(100),
  variantValue: z.string().min(1, 'Variant value required').max(100),
  sku: z.string().min(1, 'SKU required').max(50),
  purchasePrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  barcode: z.string().optional(),
});

export type CreateProductVariantRequest = z.infer<typeof CreateProductVariantSchema>;

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Name required').max(100),
  email: EmailSchema.optional().or(z.literal('')),
  phone: z.string().optional(),
  gstin: GSTINSchema.optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: PincodeSchema.optional().or(z.literal('')),
  state: z.string().optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE']).default('RETAIL'),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCustomerRequest = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerSchema>;

// ============================================================================
// SUPPLIER SCHEMAS
// ============================================================================

export const CreateSupplierSchema = z.object({
  name: z.string().min(2, 'Name required').max(100),
  email: EmailSchema.optional().or(z.literal('')),
  phone: z.string().optional(),
  gstIn: GSTINSchema.optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: PincodeSchema.optional().or(z.literal('')),
  state: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export type CreateSupplierRequest = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierSchema>;

// ============================================================================
// TAX RATE SCHEMAS
// ============================================================================

export const CreateTaxRateSchema = z.object({
  name: z.string().min(2, 'Tax rate name required').max(50),
  percentage: z.number().min(0, 'Tax % must be 0 or positive').max(100, 'Tax % must be <= 100'),
  gstSlabType: z.enum(['CGST', 'SGST', 'IGST']).optional(),
});

export type CreateTaxRateRequest = z.infer<typeof CreateTaxRateSchema>;

// ============================================================================
// INVENTORY SCHEMAS
// ============================================================================

export const InventoryStockInSchema = z.object({
  productId: z.coerce.number().int().positive('Product required'),
  quantity: z.number().positive('Quantity must be positive'),
  meters: z.number().nonnegative('Meters must be non-negative').optional(),
  purchasePrice: z.number().positive('Purchase price required'),
  supplierId: z.coerce.number().int().positive('Supplier required'),
  poNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const InventoryStockOutSchema = z.object({
  productId: z.coerce.number().int().positive('Product required'),
  quantity: z.number().positive('Quantity must be positive'),
  meters: z.number().nonnegative('Meters must be non-negative').optional(),
  reason: z.enum(['DAMAGED', 'LOSS', 'RETURN_TO_SUPPLIER', 'SAMPLE', 'OTHER']).default('OTHER'),
  notes: z.string().optional(),
});

export const InventoryAdjustmentSchema = z.object({
  productId: z.coerce.number().int().positive('Product required'),
  adjustmentQty: z.number({ required_error: 'Quantity required' }).refine(
    (val) => val !== 0,
    'Adjustment quantity cannot be zero'
  ),
  adjustmentMeters: z.number().optional(),
  reason: z.string().min(5, 'Reason required').max(200),
});

export type InventoryStockInRequest = z.infer<typeof InventoryStockInSchema>;
export type InventoryStockOutRequest = z.infer<typeof InventoryStockOutSchema>;
export type InventoryAdjustmentRequest = z.infer<typeof InventoryAdjustmentSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceItemSchema = z.object({
  productId: z.coerce.number().int().positive('Product required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price required'),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
  taxRate: z.number().nonnegative('Tax rate must be non-negative').default(0),
});

export const CreateInvoiceSchema = z.object({
  invoiceType: z.enum(['SALES', 'SALES_RETURN']).default('SALES'),
  customerId: z.coerce.number().int().positive('Customer required').optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item required'),
  invoiceDiscount: z.number().nonnegative('Invoice discount cannot be negative').default(0),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'BANK', 'ADVANCE', 'MIXED']).default('CASH'),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative').optional(),
  notes: z.string().optional(),
  createdByUserId: z.coerce.number().int().positive('User required'),
});

export const FinalizeInvoiceSchema = z.object({
  invoiceId: z.coerce.number().int().positive('Invoice required'),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item required'),
  customerId: z.coerce.number().int().positive('Customer required').optional(),
  payments: z.array(
    z.object({
      mode: z.enum(['CASH', 'CARD', 'UPI', 'BANK', 'ADVANCE']),
      amount: z.number().positive('Amount must be positive'),
      reference: z.string().optional(),
    })
  ).min(1, 'At least one payment required'),
  invoiceDiscount: z.number().nonnegative('Invoice discount cannot be negative').default(0),
});

export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;
export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceSchema>;
export type FinalizeInvoiceRequest = z.infer<typeof FinalizeInvoiceSchema>;

// ============================================================================
// RETURN SCHEMAS
// ============================================================================

export const CreateReturnSchema = z.object({
  invoiceId: z.coerce.number().int().positive('Invoice required'),
  items: z.array(
    z.object({
      invoiceItemId: z.coerce.number().int().positive('Item required'),
      returnedQty: z.number().positive('Returned quantity must be positive'),
      reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'CUSTOMER_REQUEST', 'DAMAGED_IN_TRANSIT']),
      restock: z.boolean().default(true),
    })
  ).min(1, 'At least one item required'),
  notes: z.string().optional(),
});

export type CreateReturnRequest = z.infer<typeof CreateReturnSchema>;

// ============================================================================
// ADVANCE PAYMENT SCHEMAS
// ============================================================================

export const CreateAdvancePaymentSchema = z.object({
  customerId: z.coerce.number().int().positive('Customer required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'BANK']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateAdvancePaymentRequest = z.infer<typeof CreateAdvancePaymentSchema>;

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const SalesReportSchema = z.object({
  startDate: z.string().datetime('Invalid date format').optional(),
  endDate: z.string().datetime('Invalid date format').optional(),
  customerId: z.coerce.number().int().optional(),
  invoiceType: z.enum(['SALES', 'SALES_RETURN']).optional(),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'BANK', 'ADVANCE']).optional(),
});

export const GSTReportSchema = z.object({
  startDate: z.string().datetime('Invalid date format').optional(),
  endDate: z.string().datetime('Invalid date format').optional(),
  intraState: z.boolean().optional(),
});

export const InventoryReportSchema = z.object({
  lowStockOnly: z.boolean().default(false),
  category: z.string().optional(),
});

export type SalesReportRequest = z.infer<typeof SalesReportSchema>;
export type GSTReportRequest = z.infer<typeof GSTReportSchema>;
export type InventoryReportRequest = z.infer<typeof InventoryReportSchema>;

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive('Page must be positive').default(1),
  limit: z.coerce.number().int().positive('Limit must be positive').max(100, 'Limit max 100').default(20),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;
