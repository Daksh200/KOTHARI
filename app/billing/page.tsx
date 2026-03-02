'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pos');
  }, [router]);

  return <div className="p-4 text-slate-600">Redirecting to billing...</div>;
}
