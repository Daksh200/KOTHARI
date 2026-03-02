'use client';

import React from 'react';
import { InvoiceItem } from './CartPanel';
import { Payment } from './PaymentPanel';

interface InvoicePreviewProps {
  items: InvoiceItem[];
  customerName?: string;
  payments: Payment[];
  discount: number;
}

export default function InvoicePreview({ items, customerName, payments, discount }: InvoicePreviewProps) {
  const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
  const totalTax = items.reduce((s, i) => s + i.tax, 0);
  const total = subtotal + totalTax - discount;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Invoice Preview</h2>
      {customerName && <p className="mb-2">Customer: {customerName}</p>}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.productName}</td>
              <td className="text-right">{i.quantity}</td>
              <td className="text-right">₹{i.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right">
        <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
        <p>Tax: ₹{totalTax.toFixed(2)}</p>
        <p>Discount: -₹{discount.toFixed(2)}</p>
        <p className="font-semibold">Total: ₹{total.toFixed(2)}</p>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold">Payments</h4>
        {payments.map((p, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>{p.mode}</span>
            <span>₹{p.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
