'use client';

import React, { useState } from 'react';

export interface Payment {
  mode: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'ADVANCE';
  amount: number;
  reference?: string;
}

interface PaymentPanelProps {
  balance: number;
  payments: Payment[];
  onAdd: (p: Payment) => void;
  onRemove?: (index: number) => void;
}

export default function PaymentPanel({
  balance,
  payments,
  onAdd,
  onRemove,
}: PaymentPanelProps) {
  const [mode, setMode] = useState<Payment['mode']>('CASH');
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState('');

  const submit = () => {
    if (amount <= 0) return;
    onAdd({ mode, amount, reference: reference || undefined });
    setAmount(Math.max(0, balance - amount));
    setReference('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Payment</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[0.25, 0.5, 1].map((multiplier) => (
            <button
              key={multiplier}
              onClick={() => setAmount(Number((balance * multiplier).toFixed(2)))}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              type="button"
            >
              {multiplier === 1 ? 'Full' : `${Math.round(multiplier * 100)}%`}
            </button>
          ))}
        </div>
        <div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Payment['mode'])}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank</option>
            <option value="ADVANCE">Advance</option>
          </select>
        </div>
        <div>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            value={Number.isFinite(amount) ? amount : 0}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            max={balance}
            min={0}
          />
        </div>
        {(mode === 'UPI' || mode === 'CARD') && (
          <div>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}
        <button
          onClick={submit}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={balance <= 0}
        >
          Add Payment
        </button>
      </div>
      <div className="mt-4 space-y-1 text-sm text-slate-700">
        {payments.map((p, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{p.mode}</span>
            <div className="flex items-center gap-2">
              <span>Rs {p.amount.toFixed(2)}</span>
              {onRemove && (
                <button
                  onClick={() => onRemove(idx)}
                  className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600"
                  type="button"
                >
                  x
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
