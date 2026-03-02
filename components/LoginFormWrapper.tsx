'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';

function LoginFormWithParams() {
  return <LoginForm />;
}

export default function LoginFormWrapper() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm rounded-2xl border border-white/40 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <div className="animate-pulse">
          <div className="mx-auto mb-4 h-8 w-32 rounded bg-slate-200"></div>
          <div className="mb-6 h-4 w-48 rounded bg-slate-200"></div>
          <div className="mb-4 h-10 rounded bg-slate-200"></div>
          <div className="mb-6 h-10 rounded bg-slate-200"></div>
          <div className="h-10 rounded bg-slate-200"></div>
        </div>
      </div>
    }>
      <LoginFormWithParams />
    </Suspense>
  );
}
