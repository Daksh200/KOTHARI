# Furnish POS System — Production Architecture

## Overview

This is a **professional, production-ready POS (Point of Sale) system** designed for furnishing retail shops. It handles counter billing with GST compliance, inventory stock management, advance payments, returns, and multi-user roles.

**Tech Stack:**
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Backend: Next.js API Routes (TypeScript)
- ORM: Prisma 7.x
- Database: PostgreSQL
- Authentication: JWT / Session-based (to be implemented)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│                 (React Components + Tailwind)                   │
│   ┌─ POS Counter Interface                                      │
│   ├─ Product Catalog                                            │
│   ├─ Invoice Builder (Draft → Finalize)                         │
│   ├─ Inventory Dashboard                                        │
│   └─ Admin Reports                                              │
└───────────────────┬─────────────────────────────────────────────┘
                    │ HTTP/REST
┌───────────────────▼─────────────────────────────────────────────┐
│                     API Layer (Next.js)                         │
│   ┌─ /api/invoices/create          Create draft invoice         │
│   ├─ /api/invoices/finalize        Finalize + charge           │
│   ├─ /api/returns/create           Process returns & refunds    │
│   ├─ /api/inventory/movements      Stock in/out/adjustments    │
│   ├─ /api/payments/advance         Manage advances              │
│   └─ /api/auth/*                   Login/Logout                │
│                                                                  │
│   Services (Business Logic)                                     │
│   ├─ tax-calculator.ts     → GST calculations (CGST/SGST/IGST) │
│   ├─ inventory-service.ts  → Stock management                   │
│   ├─ payment-service.ts    → Payment modes & allocations        │
│   └─ auth-service.ts       → User roles & permissions           │
└───────────────────┬─────────────────────────────────────────────┘
                    │ SQL (Prisma Client)
┌───────────────────▼─────────────────────────────────────────────┐
│              Prisma ORM + PostgreSQL                            │
│   ┌─ Schema: /prisma/schema.prisma  (22 models)                │
│   ├─ Migrations: /prisma/migrations                             │
│   └─ Database: billing_db (PostgreSQL)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (22 Models)

### Authentication & Authorization
- **User**: Staff & Admin accounts with role-based access
- **Role**: ADMIN, STAFF with permission JSON
- **AuditLog**: All sensitive operations logged

### Master Data
- **Product**: Item catalog (SKU, HSN, basePrice, unit: PIECE/METER/ROLL)
- **ProductVariant**: Sizes, colors, barcodes
- **TaxRate**: GST rates (5%, 12%, 18%, 28%)
- **Customer**: Walk-in and registered customers (with GSTIN)
- **Supplier**: Purchase sources for stock replenishment
- **Setting**: Store config (GSTIN, state code, invoice prefix)

### Inventory
- **InventoryItem**: Current stock state (totalQuantity, rollMeters, rollRemaining)
- **InventoryTransaction**: Immutable ledger (IN, OUT, SALE, RETURN, ADJUSTMENT)
- **PurchaseOrder**: Stock purchase records
- **PurchaseItem**: Line items on purchase orders

### Billing & Payments
- **Invoice**: Sales document (DRAFT → PAID/PARTIAL/REFUNDED)
- **InvoiceItem**: Line items with tax breakdown (CGST/SGST/IGST)
- **Payment**: Payment records (CASH, CARD, UPI, BANK, ADVANCE, REFUND)
- **AdvancePayment**: Customer advance ledger
- **Return**: Return records with reason tracking
- **ReturnItem**: Individual items returned with refund amounts

---

## Key Features & Workflows

### 1. **POS Billing Flow**

```
1. START INVOICE (DRAFT state)
   ├─ Select/Create Customer (optional walk-in)
   └─ New empty invoice

2. ADD ITEMS
   ├─ Select Product
   ├─ Choose Unit Price & Qty/Meters
   ├─ Apply Discount (line or invoice-level)
   └─ Store in InvoiceItem

3. CALCULATE TAX (GST Logic)
   ├─ Determine intra-state (CGST+SGST) vs inter-state (IGST)
   ├─ Tax per item = (Price × Qty - Discount) × TaxRate%
   ├─ Split tax: CGST = SGST = Tax/2 (intra) OR IGST = Tax (inter)
   └─ Round-off = total rounded - subtotal

4. PROCESS PAYMENT
   ├─ Accept multiple modes: CASH, CARD, UPI, BANK
   ├─ Support ADVANCE allocation
   └─ Validate total ≥ final amount

5. FINALIZE INVOICE (Atomic Transaction)
   ├─ Create InventoryTransaction (SALE) per item
   ├─ Update InventoryItem (reduce stock)
   ├─ Record Payment entries
   ├─ Update Invoice state → PAID / PARTIAL
   ├─ Generate Invoice Number
   └─ Create AuditLog entry

6. POST-FINALIZE
   ├─ Generate PDF/ESC-POS output
   ├─ Send SMS/Email (optional)
   └─ Backup to archive
```

### 2. **Inventory Stock Management**

**Stock Unit Types:**
- **PIECE**: Discrete units (e.g., cushions, pillows) stored in `totalQuantity`
- **METER**: Cloth sold by length; `totalQuantity` in pieces, `rollRemainingMeters` tracks current roll
- **ROLL**: Entire roll; `rollTotalMeters` and `rollRemainingMeters`

**Stock Movements (Immutable Ledger):**
- **IN**: Receive from supplier → InventoryTransaction (type=IN) + InventoryItem.totalQuantity↑
- **SALE**: Customer purchase → InventoryTransaction (type=SALE) + InventoryItem.totalQuantity↓
- **RETURN**: Item returned + restocked → InventoryTransaction (type=RETURN) + InventoryItem.totalQuantity↑
- **ADJUSTMENT**: Manual count correction → InventoryTransaction (type=ADJUSTMENT)
- **PURCHASE**: PurchaseOrder received → InventoryTransaction (type=PURCHASE)

**Concurrency:**
- Use PostgreSQL `SELECT ... FOR UPDATE` to lock InventoryItem during finalize
- Transaction-level atomicity ensures no overselling

**Low Stock Alert:**
- Monitor `InventoryItem.totalQuantity` against reorderLevel (stored in Product or InventoryItem)
- Trigger notification when stock < threshold

### 3. **GST Billing Logic**

**Intra-State (Same State as Shop):**
```
Tax = (unitPrice × qty - discount) × rate%
CGST = Tax / 2
SGST = Tax / 2
IGST = 0
```

**Inter-State (Different State):**
```
CGST = 0
SGST = 0
IGST = Tax (full amount)
```

**Determine via:** `Invoice.customer.gstin` (first 2 chars = state code)

**Invoice Creation:**
- Number format: `INV-YYYY-MM-NNNNN` (configurable, stored in Settings)
- GST e-invoice format supported (JSON export for GSTN portal)

---

## API Endpoints (Production)

### Invoices
- `POST /api/invoices/create` — Create draft invoice
- `POST /api/invoices/finalize` — Finalize, charge payment, deduct stock
- `GET /api/invoices/:id` — Fetch invoice details
- `GET /api/invoices?date=...&state=...` — List invoices (with filters)

### Returns/Refunds
- `POST /api/returns/create` — Create return, restock, refund payment
- `GET /api/returns/:id` — Fetch return details

### Inventory
- `POST /api/inventory/movements` — Manual stock adjustment
- `GET /api/inventory/items?low` — Low stock alerts
- `GET /api/inventory/ledger?productId=...` — Stock transaction history

### Payments
- `POST /api/payments/advance` — Record customer advance
- `GET /api/payments/advances?customerId=...` — Fetch customer advances

### Master Data (Admin)
- `POST /api/products` — Add product
- `POST /api/customers` — Add customer
- `POST /api/suppliers` — Add supplier
- `POST /api/tax-rates` — Configure tax rates

### Reports
- `GET /api/reports/daily-sales?date=...` — Daily revenue
- `GET /api/reports/inventory-snapshot` — Current stock levels
- `GET /api/reports/customer-ledger?customerId=...` — Customer transaction history
- `GET /api/reports/gst-export?month=...` — GST filing data (JSON/CSV)

---

## Advance Payment Workflow

```
1. RECEIVE ADVANCE from customer
   ├─ Create AdvancePayment record
   │  └─ amount, remainingAmount set = amount, allocatedAmount = 0
   └─ Record Payment (type=ADVANCE)

2. CREATE INVOICE
   ├─ Select Customer with outstanding advance
   └─ System shows available advance balance

3. ALLOCATE ADVANCE TO INVOICE
   ├─ Payment.type = ADVANCE
   ├─ Reduce AdvancePayment.remainingAmount
   ├─ Increase AdvancePayment.allocatedAmount
   └─ Invoice amount to pay reduced

4. IF ADVANCE > Invoice amount
   ├─ Allocate up to invoice amount
   └─ Remaining kept in AdvancePayment.remainingAmount

5. REFUND ADVANCE (if no future use)
   ├─ Create Payment (type=REFUND)
   ├─ Reduce AdvancePayment.remainingAmount to 0
   └─ Record reversal in AuditLog
```

---

## Return & Refund Workflow

```
1. CUSTOMER INITIATES RETURN
   ├─ Select original invoice & items to return
   └─ Reason (defect, wrong item, size mismatch, etc.)

2. STAFF PROCESSES RETURN
   ├─ Create Return record (INITIATED → PROCESSING → COMPLETED)
   ├─ For each returned item:
   │  ├─ Calculate refund = (original line total / original qty) × returned qty
   │  ├─ Create ReturnItem entry
   │  ├─ If restock=true:
   │  │  ├─ Create InventoryTransaction (type=RETURN)
   │  │  └─ Update InventoryItem.totalQuantity↑
   │  └─ If restock=false: mark as damaged/unsaleable
   └─ Calculate totalRefund

3. PROCESS REFUND PAYMENT
   ├─ Create Payment (type=REFUND)
   ├─ Amount = totalRefund
   ├─ Modes: Cash (direct), Advance (add to AdvancePayment), Bank Transfer
   └─ Record instrument reference if bank/card

4. REVERSE GST (if applicable)
   ├─ Note: Handled at tax/accounting layer
   ├─ ITC reversal if B2B GST invoice
   └─ Track in AuditLog for compliance
```

---

## Security & Role-Based Access

### Roles

**ADMIN:**
- Create/edit products, suppliers
- Manage users & permissions
- Access all reports
- Configure tax rates, settings
- View audit logs

**STAFF:**
- Create & finalize invoices
- Process returns (within limits)
- Record payments
- Cannot access product/settings config

### Enforced at:
1. **API**: Middleware checks `user.role.permissions`
2. **Database**: Row-level security via soft-delete / user_id checks
3. **UI**: Permission checks hide/disable menu items

### Audit Trail
- Every invoice finalized → AuditLog (entity_type=INVOICE, action=FINALIZED, meta=JSON)
- Every stock adjustment → AuditLog (entity_type=INVENTORY, action=ADJUSTMENT)
- Every return → AuditLog (entity_type=RETURN, action=CREATED)
- Password reset, user create → AuditLog (entity_type=USER)

---

## Data Integrity & Performance

### Transactions
- Finalize invoice = single atomic transaction (Prisma `$transaction()`)
- Ensures: Tax calc + Stock lock + Payment record + Audit = all-or-nothing

### Indexing (Optimized for 1000+ invoices/month)
```sql
-- Created automatically by Prisma:
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON Invoice(invoiceNumber);
CREATE INDEX "Invoice_invoiceNumber_idx" ON Invoice(invoiceNumber);
CREATE INDEX "InventoryItem_productId_idx" ON InventoryItem(productId);
CREATE INDEX "InventoryItem_location_idx" ON InventoryItem(location);
CREATE UNIQUE INDEX "Product_sku_key" ON Product(sku);
CREATE UNIQUE INDEX "User_email_key" ON User(email);
```

### Connection Pooling
- Use PgBouncer (external) or Prisma connection pooling
- Set: `connection_limit=20`, `pool_timeout=300`

### Caching (Future)
- Redis cache for product catalog
- Cache tax rates, customer advances
- Invalidate on update

---

## Deployment Checklist

- [ ] PostgreSQL database with backup strategy
- [ ] Environment variables (.env) with DATABASE_URL, JWT_SECRET, etc.
- [ ] Prisma migrations applied (`npx prisma migrate deploy`)
- [ ] Initial roles & admin user seeded
- [ ] HTTPS/TLS certificates
- [ ] Rate limiting on payment APIs
- [ ] Centralized logging (ELK/Cloud Logging)
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Daily backups of database
- [ ] Incident response plan

---

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up .env
DATABASE_URL="postgresql://user:password@localhost:5432/billing_db?schema=public"

# 3. Generate Prisma client
npx prisma generate

# 4. Apply migrations
npx prisma migrate deploy

# 5. Start dev server
npm run dev
```

Open `http://localhost:3000` to access the POS interface.

---

## Next Steps

1. **Implement Authentication** — JWT + secure session storage
2. **Build POS UI** — React components for invoice builder, product search
3. **Generate PDF/ESC-POS** — Invoice printing & thermal printer support
4. **Multi-Store Support** — Add `storeId` to models for multi-location chains
5. **Accounting Ledger** — Double-entry bookkeeping (GL accounts, trial balance)
6. **GST e-Invoice Integration** — API to push invoices to GSTN
7. **Mobile App** — Expo/React Native for field sales

---

## Support & Maintenance

- Prisma updates: `npm update @prisma/client prisma`
- PostgreSQL maintenance: VACUUM, ANALYZE, backups
- Monitor logs for errors, slow queries
- Regular security audits & dependency updates

---

**Document Version:** 1.0 (Feb 2026)

