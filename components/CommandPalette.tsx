'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

type Command = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
  adminOnly?: boolean;
};

export default function CommandPalette({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const commands = useMemo<Command[]>(
    () => [
      { id: 'gateway', label: 'Open Dashboard', hint: 'Alt+G', href: '/dashboard' },
      { id: 'billing', label: 'Open Billing', hint: 'Alt+S', href: '/billing' },
      { id: 'products', label: 'Open Products', hint: 'Alt+P', href: '/products' },
      { id: 'inventory', label: 'Open Inventory', hint: 'Alt+I', href: '/inventory' },
      { id: 'daybook', label: 'Open Day Book', hint: 'Alt+D', href: '/daybook' },
      { id: 'reports', label: 'Open Reports', hint: 'Alt+R', href: '/reports', adminOnly: true },
      {
        id: 'logout',
        label: 'Logout',
        hint: 'Shift+Q',
        action: async () => {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
        },
      },
    ],
    [router]
  );

  const visibleCommands = useMemo(() => {
    const base = commands.filter((cmd) => !cmd.adminOnly || isAdmin);
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.hint || '').toLowerCase().includes(q)
    );
  }, [commands, isAdmin, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.altKey && key === 'g') router.push('/dashboard');
      if (event.altKey && key === 's') router.push('/billing');
      if (event.altKey && key === 'p') router.push('/products');
      if (event.altKey && key === 'i') router.push('/inventory');
      if (event.altKey && key === 'd') router.push('/daybook');
      if (isAdmin && event.altKey && key === 'r') router.push('/reports');
      if (event.shiftKey && key === 'q') {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
      }
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-20 max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search command... (Ctrl+K)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {visibleCommands.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No command found.</p>
          ) : (
            visibleCommands.map((cmd) =>
              cmd.href ? (
                <Link
                  key={cmd.id}
                  href={cmd.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <span className="text-sm text-slate-800">{cmd.label}</span>
                  <span className="text-xs text-slate-500">{cmd.hint}</span>
                </Link>
              ) : (
                <button
                  key={cmd.id}
                  onClick={async () => {
                    await cmd.action?.();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm text-slate-800">{cmd.label}</span>
                  <span className="text-xs text-slate-500">{cmd.hint}</span>
                </button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
