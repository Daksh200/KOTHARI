'use client';
import React from 'react';
import LoginFormWrapper from '../../components/LoginFormWrapper';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#f59e0b33,transparent_45%),radial-gradient(circle_at_left,#0ea5e933,transparent_35%)]" />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        <div className="hidden rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur md:block">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-amber-300">
            Kothari Furnishing
          </p>
          <h1 className="mb-3 text-4xl font-bold leading-tight">
            Billing that feels fast, clear, and dependable.
          </h1>
          <p className="text-slate-200">
            Manage sales, payments, invoices, and inventory from a single
            workspace built for counter speed.
          </p>
        </div>
        <div className="relative z-10">
          <LoginFormWrapper />
        </div>
      </div>
    </div>
  );
}
