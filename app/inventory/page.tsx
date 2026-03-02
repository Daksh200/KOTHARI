'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

type InventoryItem = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  category: string | null;
  balance: number;
  alert: 'LOW' | 'OK';
  location: string;
};

type FormState = {
  productId: string;
  quantity: string;
  note: string;
};

const initialForm: FormState = {
  productId: '',
  quantity: '',
  note: '',
};

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockInForm, setStockInForm] = useState<FormState>(initialForm);
  const [stockOutForm, setStockOutForm] = useState<FormState>(initialForm);
  const [adjustForm, setAdjustForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);

  const loadInventory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to fetch inventory');
      setRows(json?.data?.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const submitStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInventoryAction('/api/inventory/stock-in', {
      productId: Number(stockInForm.productId),
      quantity: Number(stockInForm.quantity),
      note: stockInForm.note,
    });
    setStockInForm(initialForm);
  };

  const submitStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInventoryAction('/api/inventory/stock-out', {
      productId: Number(stockOutForm.productId),
      quantity: Number(stockOutForm.quantity),
      note: stockOutForm.note,
    });
    setStockOutForm(initialForm);
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInventoryAction('/api/inventory/adjustment', {
      productId: Number(adjustForm.productId),
      adjustmentQty: Number(adjustForm.quantity),
      note: adjustForm.note,
    });
    setAdjustForm(initialForm);
  };

  const submitInventoryAction = async (url: string, payload: any) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Inventory action failed');
      await loadInventory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Inventory Management">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(120deg,#0f172a,#14532d)] p-4 text-slate-100 shadow-md">
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Stock Operations</p>
        <p className="text-sm text-slate-200">Process inward/outward and manual adjustments with audit trail.</p>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ActionCard title="Stock In" onSubmit={submitStockIn}>
          <FormFields
            rows={rows}
            form={stockInForm}
            setForm={setStockInForm}
            qtyLabel="In Qty"
            saving={saving}
            actionLabel="Record In"
          />
        </ActionCard>

        <ActionCard title="Stock Out" onSubmit={submitStockOut}>
          <FormFields
            rows={rows}
            form={stockOutForm}
            setForm={setStockOutForm}
            qtyLabel="Out Qty"
            saving={saving}
            actionLabel="Record Out"
          />
        </ActionCard>

        <ActionCard title="Adjustment (+/-)" onSubmit={submitAdjustment}>
          <FormFields
            rows={rows}
            form={adjustForm}
            setForm={setAdjustForm}
            qtyLabel="Adjust Qty"
            saving={saving}
            actionLabel="Adjust"
            allowNegative
          />
        </ActionCard>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">Alert</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  Loading inventory...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  No inventory records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{row.category || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.location}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.balance}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.alert === 'LOW'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.alert}
                    </span>
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

function ActionCard({
  title,
  onSubmit,
  children,
}: {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="mb-3 font-semibold text-slate-900">{title}</p>
      {children}
    </form>
  );
}

function FormFields({
  rows,
  form,
  setForm,
  qtyLabel,
  saving,
  actionLabel,
  allowNegative = false,
}: {
  rows: InventoryItem[];
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  qtyLabel: string;
  saving: boolean;
  actionLabel: string;
  allowNegative?: boolean;
}) {
  return (
    <div className="space-y-2">
      <select
        required
        value={form.productId}
        onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      >
        <option value="">Select product</option>
        {rows.map((row) => (
          <option key={row.id} value={row.productId}>
            {row.name} ({row.balance})
          </option>
        ))}
      </select>

      <input
        type="number"
        required
        step="1"
        min={allowNegative ? undefined : 1}
        placeholder={qtyLabel}
        value={form.quantity}
        onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />

      <input
        placeholder="Note"
        value={form.note}
        onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />

      <button
        disabled={saving}
        className="w-full rounded-lg bg-slate-900 py-2 text-white disabled:bg-slate-400"
      >
        {saving ? 'Saving...' : actionLabel}
      </button>
    </div>
  );
}
