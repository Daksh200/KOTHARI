'use client';

import React, { useEffect, useState } from 'react';

export default function StockSummaryPage() {
  const [stocks, setStocks] = useState<any>(null);

  useEffect(() => {
    fetch('/api/inventory', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((res) => res.json())
      .then(setStocks)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quick Stock View</h1>
      {stocks ? (
        <pre className="bg-white p-4 rounded shadow">{JSON.stringify(stocks, null, 2)}</pre>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}
