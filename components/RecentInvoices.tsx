'use client';

import React, { useEffect, useState } from 'react';

type RecentInvoice = {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  state: string;
  customerName: string;
  paidAmount: number;
};

export default function RecentInvoices() {
  const [rows, setRows] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invoices/recent?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load recent invoices');
      setRows(json?.data?.invoices || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download PDF');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'PDF download failed');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-900">Recent Invoices</h3>
        <button
          onClick={load}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
        >
          Refresh
        </button>
      </div>
      <div className="max-h-80 overflow-auto">
        {loading ? (
          <p className="px-4 py-4 text-sm text-slate-500">Loading recent invoices...</p>
        ) : error ? (
          <p className="px-4 py-4 text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Invoice</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{row.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.customerName}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    Rs {row.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => downloadPdf(row.id, row.invoiceNumber)}
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
