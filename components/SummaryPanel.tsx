'use client';

import React from 'react';
import { InvoiceItem } from './CartPanel';

interface SummaryPanelProps {
  items: InvoiceItem[];
  discount: number;
  paymentsTotal: number;
  gstEnabled: boolean;
  onDiscountChange: (value: number) => void;
  onGstToggle: (enabled: boolean) => void;
}

export default function SummaryPanel({
  items,
  discount,
  paymentsTotal,
  gstEnabled,
  onDiscountChange,
  onGstToggle,
}: SummaryPanelProps) {
  const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
  const totalTax = gstEnabled ? items.reduce((s, i) => s + i.tax, 0) : 0;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const total = subtotal + totalTax - discount;
  const balance = total - paymentsTotal;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Summary</h3>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-xs">
          Discount
          <input
            type="number"
            min={0}
            value={Number.isFinite(discount) ? discount : 0}
            onChange={(e) => onDiscountChange(Math.max(0, Number(e.target.value || 0)))}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="col-span-1 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
          GST
          <input
            type="checkbox"
            checked={gstEnabled}
            onChange={(e) => onGstToggle(e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>
      <div className="space-y-2 text-sm text-slate-700">
        <div className="flex justify-between">
          <span>Taxable Amount</span>
          <span>Rs {subtotal.toFixed(2)}</span>
        </div>
        {gstEnabled ? (
          <>
            <div className="flex justify-between">
              <span>CGST</span>
              <span>Rs {cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST</span>
              <span>Rs {sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total GST</span>
              <span>Rs {totalTax.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>GST</span>
            <span>Rs 0.00</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Discount</span>
          <span>- Rs {discount.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>Rs {total.toFixed(2)}</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex justify-between text-slate-700">
            <span>Paid</span>
            <span>Rs {paymentsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Balance</span>
            <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
              Rs {balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
