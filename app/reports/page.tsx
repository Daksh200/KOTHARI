'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

type ReportProduct = {
  productId: number;
  name: string;
  revenue: number;
  qty: number;
  estimatedProfit: number;
};

type ReportData = {
  dailySale: number;
  monthlySale: number;
  invoicesToday: number;
  estimatedProfitToday: number;
  topProducts: ReportProduct[];
  period?: {
    startDate: string;
    endDate: string;
  };
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const todayIso = new Date().toISOString().slice(0, 10);
const firstDayIso = `${todayIso.slice(0, 8)}01`;

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstDayIso);
  const [endDate, setEndDate] = useState(todayIso);

  const fetchReport = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', `${startDate}T00:00:00.000Z`);
      if (endDate) params.set('endDate', `${endDate}T23:59:59.999Z`);

      const res = await fetch(`/api/reports/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to load reports');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <AppShell title="Reports">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(120deg,#1e1b4b,#0f172a)] p-4 text-slate-100 shadow-md">
        <p className="text-xs uppercase tracking-[0.16em] text-indigo-300">Analytics Console</p>
        <p className="text-sm text-slate-200">Filter period-based performance and top-selling products.</p>
      </div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={fetchReport}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Daily Sale" value={loading || !data ? '...' : currency.format(data.dailySale)} />
        <Metric
          label="Period Sale"
          value={loading || !data ? '...' : currency.format(data.monthlySale)}
        />
        <Metric
          label="Invoices Today"
          value={loading || !data ? '...' : String(data.invoicesToday)}
        />
        <Metric
          label="Estimated Profit"
          value={loading || !data ? '...' : currency.format(data.estimatedProfitToday)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Top Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Qty Sold</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Est. Profit</th>
              </tr>
            </thead>
            <tbody>
              {!loading && (!data || data.topProducts.length === 0) ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    No sales data available for selected dates.
                  </td>
                </tr>
              ) : (
                (data?.topProducts || []).map((item) => (
                  <tr key={item.productId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2 text-right">{currency.format(item.revenue)}</td>
                    <td className="px-3 py-2 text-right">{currency.format(item.estimatedProfit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
