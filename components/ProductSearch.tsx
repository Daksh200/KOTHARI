'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface Product {
  id: number;
  name: string;
  basePrice: number;
  taxRate: { percentage: number } | null;
  unit: 'PIECE' | 'METER' | 'ROLL';
}

interface ProductSearchProps {
  onSelect: (product: Product) => void;
}

interface ProductSearchPropsWithRef extends ProductSearchProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ProductSearch({
  onSelect,
  inputRef,
}: ProductSearchPropsWithRef) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/search?query=${encodeURIComponent(
            query
          )}&includeOutOfStock=true`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const rows = data?.data?.products || [];
          setResults(
            rows.map((p: any) => ({
              id: p.id,
              name: p.name,
              basePrice: p.price ?? p.basePrice,
              taxRate: p.taxRate ? { percentage: p.taxRate } : null,
              unit: p.unit,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results[0]) {
      onSelect(results[0]);
      setQuery('');
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        autoFocus={!inputRef}
        type="text"
        placeholder="Search product by name, SKU, or barcode..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search products"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
      {loading && (
        <div className="absolute top-full left-0 mt-1 text-sm text-slate-500">
          Searching...
        </div>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl touch-auto">
          {results.map((p) => (
            <li
              key={p.id}
              className="cursor-pointer px-4 py-3 text-base hover:bg-slate-50"
              onClick={() => onSelect(p)}
            >
              {p.name} - Rs {p.basePrice.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
