'use client';

import React, { useEffect, useState } from 'react';

export default function SalesSummaryPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reports/daily-sales', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((res) => res.json())
      .then(setSummary)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Daily Sales Summary</h1>
      {summary ? (
        <pre className="bg-white p-4 rounded shadow">{JSON.stringify(summary, null, 2)}</pre>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}
