'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

type Summary = {
  todaySales: number;
  monthSales: number;
  lowStockItems: number;
  totalItems: number;
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsAdmin((user?.role || '').toUpperCase() === 'ADMIN');
      } catch {
        setIsAdmin(false);
      }
    }

    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('/api/dashboard/summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load dashboard');
        setSummary(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <AppShell title="Dashboard">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(120deg,#0f172a,#1e3a8a)] p-5 text-slate-100 shadow-lg">
        <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Business Snapshot</p>
        <h3 className="mt-1 text-xl font-semibold">Gateway summary, similar to Tally flow</h3>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Today Sale"
          value={loading || !summary ? '...' : currency.format(summary.todaySales)}
        />
        <Card
          label="Month Sale"
          value={loading || !summary ? '...' : currency.format(summary.monthSales)}
        />
        <Card
          label="Stock Low"
          value={loading || !summary ? '...' : `${summary.lowStockItems} Items`}
        />
        <Card
          label="Total Items"
          value={loading || !summary ? '...' : String(summary.totalItems)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <QuickLink href="/billing" title="New Bill" subtitle="Start counter sales now" />
        <QuickLink href="/daybook" title="Day Book" subtitle="Voucher-wise daily entries" />
        <QuickLink href="/products" title="Products" subtitle="Manage catalog and pricing" />
        <QuickLink href="/inventory" title="Inventory" subtitle="Stock in, out and adjustments" />
        {isAdmin && (
          <QuickLink href="/reports" title="Reports" subtitle="Sales and profit insights" />
        )}
      </div>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </Link>
  );
}
