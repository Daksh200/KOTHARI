'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

type ProductRow = {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  costPrice: number | null;
  basePrice: number;
  gstRate: number;
  taxRateId?: number | null;
  unit: 'PIECE' | 'METER' | 'ROLL';
  stock: number;
  isActive: boolean;
};

type CreateForm = {
  name: string;
  sku: string;
  category: string;
  unit: 'PIECE' | 'METER' | 'ROLL';
  basePrice: string;
  costPrice: string;
};

const initialForm: CreateForm = {
  name: '',
  sku: '',
  category: '',
  unit: 'PIECE',
  basePrice: '',
  costPrice: '',
};

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products?page=1&limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to fetch products');
      setRows(json?.data?.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || null,
        unit: form.unit,
        basePrice: Number(form.basePrice),
        costPrice: form.costPrice ? Number(form.costPrice) : null,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to create product');

      setForm(initialForm);
      await loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const quickEdit = async (product: ProductRow) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const nextPrice = prompt(`New selling price for ${product.name}`, String(product.basePrice));
    if (!nextPrice) return;

    const parsed = Number(nextPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert('Invalid price');
      return;
    }

    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ basePrice: parsed }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || json?.message || 'Failed to update product');
      return;
    }

    await loadProducts();
  };

  const deactivate = async (product: ProductRow) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm(`Deactivate ${product.name}?`)) return;

    const res = await fetch(`/api/products/${product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || json?.message || 'Failed to deactivate');
      return;
    }

    await loadProducts();
  };

  return (
    <AppShell title="Product Management">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(120deg,#0f172a,#334155)] p-4 text-slate-100 shadow-md">
        <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Catalog Control</p>
        <p className="text-sm text-slate-200">Maintain price, unit, and product status for counter billing.</p>
      </div>
      <form
        onSubmit={createProduct}
        className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
      >
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={form.unit}
          onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value as any }))}
        >
          <option value="PIECE">PIECE</option>
          <option value="METER">METER</option>
          <option value="ROLL">ROLL</option>
        </select>
        <input
          type="number"
          step="0.01"
          className="rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Selling price"
          value={form.basePrice}
          onChange={(e) => setForm((s) => ({ ...s, basePrice: e.target.value }))}
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Cost price"
            value={form.costPrice}
            onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={9}>
                  Loading products...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={9}>
                  No products found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.category || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{row.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    Rs {Number(row.costPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    Rs {Number(row.basePrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        row.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => quickEdit(row)}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                      >
                        Edit Price
                      </button>
                      {row.isActive && (
                        <button
                          onClick={() => deactivate(row)}
                          className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
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
