'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Invalid credentials');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      const nextPath = searchParams.get('next');
      router.replace(nextPath || '/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-white/40 bg-white/90 p-8 shadow-2xl backdrop-blur"
    >
      <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-slate-900">
        Welcome Back
      </h2>
      <p className="mb-6 text-center text-sm text-slate-600">
        Sign in to continue to Furnish POS
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email or Username
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
          placeholder="admin@furnish.local"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
