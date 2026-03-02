'use client';

import React, { useRef, useState } from 'react';
import { CartProvider, useCart } from '../../context/CartContext';
import ProductSearch, { Product } from '../../components/ProductSearch';
import CartPanel from '../../components/CartPanel';
import SummaryPanel from '../../components/SummaryPanel';
import PaymentPanel, { Payment } from '../../components/PaymentPanel';
import CustomerSelector from '../../components/CustomerSelector';
import PrintModal from '../../components/PrintModal';
import { InvoiceItem } from '../../components/CartPanel';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import AppShell from '../../components/AppShell';
import RecentInvoices from '../../components/RecentInvoices';

function PosScreen() {
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    items,
    addItem,
    updateQty,
    updateTaxRate,
    applyTaxRateToAll,
    removeItem,
    discount,
    payments,
    addPayment,
    removePayment,
    customerId,
    customerName,
    setCustomer,
    setDiscount,
    reset,
  } = useCart();
  const [gstEnabled, setGstEnabled] = useState(true);
  const storeGstin = process.env.NEXT_PUBLIC_STORE_GSTIN || '27AABCK1234F1Z9';

  // derived totals for keyboard actions
  const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
  const totalTax = gstEnabled ? items.reduce((s, i) => s + i.tax, 0) : 0;
  const total = subtotal + totalTax - discount;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, +(total - paid).toFixed(2));

  // keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'f', handler: () => searchRef.current?.focus() },
    // Quick payment shortcuts: Ctrl+1 -> Cash, Ctrl+2 -> Card, Ctrl+3 -> UPI, Ctrl+4 -> Bank, Ctrl+5 -> Advance
    { key: 'Control+1', handler: () => balance > 0 && addPayment({ mode: 'CASH', amount: balance }) },
    { key: 'Control+2', handler: () => balance > 0 && addPayment({ mode: 'CARD', amount: balance }) },
    { key: 'Control+3', handler: () => balance > 0 && addPayment({ mode: 'UPI', amount: balance }) },
    { key: 'Control+4', handler: () => balance > 0 && addPayment({ mode: 'BANK', amount: balance }) },
    { key: 'Control+5', handler: () => balance > 0 && addPayment({ mode: 'ADVANCE', amount: balance }) },
    { key: 'Control+P', handler: () => { if (items.length) handleFinalize(); } },
    { key: 'Escape', handler: () => { if (items.length && confirm('Clear current invoice?')) reset(); } },
  ]);

  const handleProductSelect = (p: Product) => {
    addItem(p);
  };

  const handleFinalize = async () => {
    // call backend finalize endpoint
    try {
      const payloadItems = items.map((item) => {
        if (gstEnabled) return item;
        const taxableAmount = item.quantity * item.unitPrice - item.discount;
        return {
          ...item,
          taxRate: 0,
          tax: 0,
          lineTotal: taxableAmount,
          taxableAmount,
        };
      });

      const res = await fetch('/api/invoices/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          items: payloadItems,
          customerId,
          payments,
          discount,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to create invoice');
      const invoiceId = body.id ?? body.invoiceId ?? body.invoiceNumber ?? 'unknown';
      // open preview/print modal; keep cart until user closes or confirms
      setPreviewInvoice({
        id: invoiceId,
        items: payloadItems as InvoiceItem[],
        customerName: customerName,
        payments,
        discount,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  };

  const [previewInvoice, setPreviewInvoice] = useState<null | { id: number | string; items: InvoiceItem[]; customerName?: string; payments: Payment[]; discount: number }>(null);

  return (
    <AppShell title="Counter Billing">
      <div className="mb-4 rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-4 py-3 text-sm text-slate-200 shadow-sm">
        Shortcuts: F (focus search), Ctrl+1..5 (quick payments), Ctrl+P (finalize), Esc (clear cart)
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kothari Furnishing</p>
            <p className="font-semibold text-slate-900">GSTIN: {storeGstin}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Quick GST Slabs:</span>
            {[0, 5, 12, 18, 28].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => applyTaxRateToAll(rate)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          Sales
        </span>
        <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          Customer
        </span>
        <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          Discount & Tax
        </span>
        <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          Payments
        </span>
        <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          Invoice Download
        </span>
      </div>

      <div className="flex items-center mb-4">
        <CustomerSelector
          selected={customerId ? { id: customerId, name: customerName || '', phone: '' } : undefined}
          onSelect={(c) => setCustomer(c.id, c.name)}
          onCreate={async (name, phone) => {
            const res = await fetch('/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ name, phone }),
            });
            if (res.ok) {
              const cust = await res.json();
              const row = cust?.data || cust;
              setCustomer(row.id, row.name);
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
        <div className="md:col-span-3 flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="mb-2">
            <div className="relative">
              <ProductSearch onSelect={handleProductSelect} inputRef={searchRef} />
              <span className="absolute right-2 top-2 text-xs text-slate-400 select-none">F</span>
            </div>
          </div>
          <CartPanel
            items={items}
            onQtyChange={updateQty}
            onTaxRateChange={updateTaxRate}
            onRemove={removeItem}
          />
        </div>
        <div className="md:col-span-1 space-y-4">
          <SummaryPanel
            items={items}
            discount={discount}
            paymentsTotal={payments.reduce((s, p) => s + p.amount, 0)}
            gstEnabled={gstEnabled}
            onDiscountChange={setDiscount}
            onGstToggle={setGstEnabled}
          />
          <PaymentPanel
            balance={total - payments.reduce((s, p) => s + p.amount, 0)}
            payments={payments}
            onAdd={(p) => addPayment(p)}
            onRemove={(index) => removePayment(index)}
          />
          <button
            onClick={handleFinalize}
            className="relative w-full rounded-xl bg-emerald-600 py-3 text-lg font-semibold text-white transition hover:bg-emerald-700 md:py-4"
            disabled={items.length === 0}
            title="Ctrl+P"
            aria-label="Finalize invoice and prepare PDF download (Ctrl+P)"
          >
            Finalize + PDF
            <span className="absolute right-2 top-1 text-xs text-white/70 select-none">
              Ctrl+P
            </span>
          </button>
        </div>
        <div className="md:col-span-1">
          <RecentInvoices />
        </div>
      </div>
      {previewInvoice && (
        <PrintModal
          invoiceId={previewInvoice.id}
          items={previewInvoice.items}
          customerName={previewInvoice.customerName}
          payments={previewInvoice.payments}
          discount={previewInvoice.discount}
          onClose={() => {
            setPreviewInvoice(null);
            // clear cart after printing/closing preview
            reset();
          }}
        />
      )}
    </AppShell>
  );
}

export default function PosPageWrapper() {
  return (
    <CartProvider>
      <PosScreen />
    </CartProvider>
  );
}
