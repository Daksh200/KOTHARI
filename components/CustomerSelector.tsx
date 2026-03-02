'use client';

import React, { useState } from 'react';

export interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface CustomerSelectorProps {
  selected?: Customer | null;
  onSelect: (c: Customer) => void;
  onCreate: (name: string, phone: string) => void;
}

export default function CustomerSelector({
  selected,
  onSelect,
  onCreate,
}: CustomerSelectorProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const lookup = async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/customers/search?query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data?.data?.customers || []);
    }
  };

  const createCustomer = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, newPhone.trim());
    setNewName('');
    setNewPhone('');
    setShowCreate(false);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
        >
          {showCreate ? 'Cancel' : 'New Customer'}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Search customer by name or phone..."
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            lookup(value);
          }}
        />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((c) => (
              <li
                key={c.id}
                className="cursor-pointer px-3 py-2 hover:bg-slate-50"
                onClick={() => {
                  onSelect(c);
                  setResults([]);
                  setSearch('');
                }}
              >
                <div className="font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500">{c.phone || '-'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-700">
          Selected: <span className="font-medium">{selected.name}</span>
        </div>
      )}

      {showCreate && (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Customer name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Phone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <button
            type="button"
            onClick={createCustomer}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-white"
          >
            Save Customer
          </button>
        </div>
      )}
    </div>
  );
}
