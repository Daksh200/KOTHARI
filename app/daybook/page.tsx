'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

type DayBookEntry = {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  voucherNo: string;
  party: string;
  amount: number;
  mode?: string;
};

type DayBookResponse = {
  date: string;
  totalEntries: number;
  totalInvoiceAmount: number;
  totalPaymentAmount: number;
  entries: DayBookEntry[];
};

const today = new Date().toISOString().slice(0, 10);

export default function DayBookPage() {
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DayBookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/daybook?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to load day book');
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load day book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  return (
    <AppShell title="Day Book">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(120deg,#0f172a,#1d4ed8)] p-4 text-slate-100 shadow-md">
        <p className="text-xs uppercase tracking-[0.16em] text-sky-300">Tally-style Ledger</p>
        <p className="text-sm text-slate-200">All vouchers for the day in one place.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <button onClick={load} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          Load Day Book
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Entries" value={loading || !data ? '...' : String(data.totalEntries)} />
        <Metric
          label="Invoice Amount"
          value={loading || !data ? '...' : `Rs ${data.totalInvoiceAmount.toFixed(2)}`}
        />
        <Metric
          label="Payment Amount"
          value={loading || !data ? '...' : `Rs ${data.totalPaymentAmount.toFixed(2)}`}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Voucher No</th>
              <th className="px-4 py-3 text-left">Party</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Loading entries...
                </td>
              </tr>
            ) : !data || data.entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  No entries found for this date.
                </td>
              </tr>
            ) : (
              data.entries.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(entry.date).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        entry.type === 'INVOICE'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{entry.voucherNo}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.party}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.mode || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    Rs {entry.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
