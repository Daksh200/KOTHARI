# Backend API Quick Reference & Examples

## 1. Authentication

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@furnishpos.com",
    "password": "Admin@123"
  }'

# Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@furnishpos.com",
      "name": "Admin User",
      "role": "ADMIN"
    }
  }
}
```

### Verify Token
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 2. Product Management

### List All Products (Paginated)
```bash
curl http://localhost:3000/api/products?page=1&limit=20 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fast Product Search (POS)
```bash
# Search by name
curl "http://localhost:3000/api/products/search?query=Curtain" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by barcode (fastest)
curl "http://localhost:3000/api/products/search?barcode=1234567890" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by SKU
curl "http://localhost:3000/api/products/search?sku=CUR-001" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "total": 3,
    "products": [
      {
        "id": 1,
        "name": "Blue Window Curtain",
        "sku": "CUR-001",
        "barcode": "1234567890",
        "sellingPrice": 1200,
        "taxRate": 18,
        "inventory": {
          "quantity": 45,
          "meters": 0,
          "isLowStock": false
        }
      }
    ]
  }
}
```

### Create Product (Admin Only)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Blue Window Curtain",
    "sku": "CUR-001",
    "category": "Curtains",
    "unit": "METER",
    "purchasePrice": 800,
    "sellingPrice": 1200,
    "taxRateId": 3,
    "reorderLevel": 10,
    "supplierId": 1,
    "isMeterBased": true
  }'
```

---

## 3. Inventory Management

### Record Stock Received (Stock IN)
```bash
curl -X POST http://localhost:3000/api/inventory/stock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 50,
    "meters": 100,
    "purchasePrice": 800,
    "supplierId": 1,
    "poNumber": "PO-2026-001",
    "notes": "Received from supplier"
  }'

# Response: Updated inventory + audit transaction created
```

### Record Damage/Loss (Stock OUT)
```bash
curl -X POST http://localhost:3000/api/inventory/stock-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 1,
    "quantity": 2,
    "reason": "DAMAGED",
    "notes": "Found damaged during stock check"
  }'
```

### Manual Inventory Adjustment
```bash
curl -X POST http://localhost:3000/api/inventory/adjustment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 1,
    "adjustmentQty": -3,
    "reason": "Physical count discrepancy - 3 units missing"
  }'
```

---

## 4. Customer Management

### Create Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "email": "rajesh@example.com",
    "gstIn": "27AABCD1234H1Z5",
    "address": "123 Main Street",
    "city": "Bangalore",
    "pincode": "560001",
    "state": "Karnataka",
    "customerType": "RETAIL"
  }'
```

### Search Customer (POS Counter)
```bash
curl "http://localhost:3000/api/customers/search?query=Rajesh" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "total": 1,
    "customers": [
      {
        "id": 15,
        "name": "Rajesh Kumar",
        "phone": "9876543210",
        "email": "rajesh@example.com",
        "customerType": "RETAIL",
        "gstIn": "27AABCD1234H1Z5"
      }
    ]
  }
}
```

### Get Customer Details
```bash
curl http://localhost:3000/api/customers/15 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Includes: payment history, last invoices, advance balance
```

---

## 5. Billing & Invoices

### Create Invoice (Draft)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 15,
    "invoiceType": "SALES",
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "unitPrice": 1200,
        "discount": 0,
        "taxRate": 18
      }
    ],
    "notes": "Counter sale"
  }'

# Returns: Invoice in DRAFT state
```

### Finalize Invoice (ATOMIC - 11 STEPS)
```bash
curl -X POST http://localhost:3000/api/invoices/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": 42,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "unitPrice": 1200,
        "discount": 100,
        "taxRate": 18
      }
    ],
    "payments": [
      {
        "mode": "CASH",
        "amount": 2636
      }
    ],
    "customerId": 15,
    "invoiceDiscount": 0
  }'

# Response includes:
# - Invoice details (finalized, state=PAID)
# - Tax summary (CGST, SGST/IGST)
# - Inventory deductions
# - Payment recording
# - Audit log entry
```

### Download Invoice PDF
```bash
curl http://localhost:3000/api/invoices/42/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output invoice-2026-001.pdf

# Returns: PDF file (attachment)
```

---

## 6. Returns & Refunds

### Process Return
```bash
curl -X POST http://localhost:3000/api/returns/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": 42,
    "items": [
      {
        "invoiceItemId": 120,
        "returnedQty": 1,
        "reason": "DEFECTIVE",
        "restock": true
      }
    ],
    "notes": "Customer returned defective item"
  }'

# Creates: Return record + Refund payment + Inventory restock
```

---

## 7. Reports

### Sales Report
```bash
curl "http://localhost:3000/api/reports/sales?startDate=2026-02-01&endDate=2026-02-28&invoiceType=SALES" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns: Total sales, items sold, revenue by product
```

### GST Report
```bash
curl "http://localhost:3000/api/reports/gst?startDate=2026-02-01&endDate=2026-02-28" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns: CGST, SGST, IGST totals (for filing)
```

### Inventory Report
```bash
curl "http://localhost:3000/api/reports/inventory?lowStockOnly=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns: Products below reorder level
```

---

## 8. Error Examples

### Validation Error (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid product data",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "path": "quantity",
      "message": "Quantity must be positive"
    }
  ]
}
```

### Insufficient Stock (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Insufficient stock",
  "errorCode": "INSUFFICIENT_STOCK",
  "details": {
    "productId": 1,
    "productName": "Blue Curtain",
    "availableQty": 5,
    "requestedQty": 10,
    "shortBy": 5
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED"
}
```

### Not Found (404)
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Customer not found",
  "errorCode": "NOT_FOUND"
}
```

---

## 9. Common Headers

```bash
# All requests (except login) require:
Authorization: Bearer YOUR_JWT_TOKEN

# Request content type:
Content-Type: application/json

# Example full request:
curl -X POST http://localhost:3000/api/invoices/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{...}'
```

---

## 10. Response Format (All Endpoints)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    // Endpoint-specific data
  },
  "timestamp": "2026-02-28T14:30:00Z"
}
```

---

## 11. Pagination

All list endpoints support pagination:

```bash
curl "http://localhost:3000/api/invoices?page=2&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Parameters:
# page: 1, 2, 3, ... (default: 1)
# limit: 1-100 (default: 20)
```

---

## 12. Testing with cURL Tips

### Save token to variable
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@furnishpos.com","password":"Admin@123"}' \
  | jq -r '.data.token')

echo $TOKEN

# Use it in requests:
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty print JSON response
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Save response to file
```bash
curl http://localhost:3000/api/invoices/42/pdf \
  -H "Authorization: Bearer $TOKEN" \
  --output invoice.pdf
```

---

## 13. Testing with Postman

1. **Create Environment Variable:**
   - Set `{{token}}` = JWT token from login response
   - Set `{{base_url}}` = http://localhost:3000

2. **Create Request:**
   - URL: `{{base_url}}/api/products`
   - Header: `Authorization: Bearer {{token}}`
   - Body: JSON

3. **Pre-request Script (Auto-login):**
   ```javascript
   // Auto-refresh token before each request
   const loginRequest = {
     url: pm.environment.get("base_url") + "/api/auth/login",
     method: "POST",
     header: { "Content-Type": "application/json" },
     body: {
       mode: "raw",
       raw: JSON.stringify({
         email: "admin@furnishpos.com",
         password: "Admin@123"
       })
     }
   };
   
   pm.sendRequest(loginRequest, (err, response) => {
     pm.environment.set("token", response.json().data.token);
   });
   ```

---

## 14. Rate Limiting & Throttling

Currently: No rate limiting. For production, add:

```typescript
// app/lib/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts max
  message: 'Too many login attempts'
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute per IP
});
```

---

## 15. Webhook/Async Operations

For payment gateway callbacks, handle webhooks:

```typescript
// app/api/webhooks/payment/route.ts
export async function POST(req: NextRequest) {
  const payload = await req.json();
  
  // Verify webhook signature
  const signature = req.headers.get('x-webhook-signature');
  if (!verifySignature(payload, signature)) {
    return errorResponse(401, 'Invalid signature');
  }
  
  // Handle async payment update
  // (Update Payment.status from PENDING to COMPLETED)
  
  return successResponse(null, 'Webhook processed');
}
```

---

## Ready to Test!

Use these examples to test your API layer. All endpoints are fully functional and tested.

**Next Step:** Integrate with frontend React components and test end-to-end invoice flow!

