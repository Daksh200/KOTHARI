'use client';

import React, { useMemo, useState } from 'react';
import { InvoiceItem } from './CartPanel';
import { Payment } from './PaymentPanel';

interface Props {
  invoiceId: number | string;
  items: InvoiceItem[];
  customerName?: string;
  payments: Payment[];
  discount: number;
  onClose: () => void;
}

export default function PrintModal({
  invoiceId,
  items,
  customerName,
  payments,
  discount,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);
    const tax = items.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = subtotal + tax - discount;
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = grandTotal - paid;
    return { subtotal, tax, grandTotal, paid, balance };
  }, [items, payments, discount]);

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Invoice #{invoiceId}</h3>
            <p className="text-sm text-slate-500">Customer: {customerName || 'Walk-in Customer'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadPDF}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {loading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Tax</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">Rs {item.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">Rs {item.tax.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">Rs {item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="font-medium text-slate-900">{item.productName}</div>
                <div className="mt-1 text-xs text-slate-600">
                  Qty {item.quantity} x Rs {item.unitPrice.toFixed(2)}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Rs {item.lineTotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>Rs {totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>- Rs {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Grand Total</span>
              <span>Rs {totals.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>Rs {totals.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance</span>
              <span className={totals.balance > 0 ? 'text-red-600' : 'text-emerald-700'}>
                Rs {totals.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
