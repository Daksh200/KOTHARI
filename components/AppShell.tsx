'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import CommandPalette from './CommandPalette';

type SessionUser = {
  id?: number;
  email?: string;
  name?: string;
  role?: string;
};

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Home',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/daybook', label: 'Day Book' },
    ],
  },
  {
    title: 'Billing',
    items: [{ href: '/billing', label: 'Billing' }],
  },
  {
    title: 'Products',
    items: [
      { href: '/products', label: 'Products' },
      { href: '/inventory', label: 'Inventory' },
    ],
  },
  {
    title: 'Reports',
    items: [{ href: '/reports', label: 'Reports', adminOnly: true }],
  },
];

export default function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useState<SessionUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser) as SessionUser;
    } catch {
      return null;
    }
  });

  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';

  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.adminOnly || isAdmin),
        }))
        .filter((group) => group.items.length > 0),
    [isAdmin]
  );

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // no-op
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-transparent">
      <CommandPalette isAdmin={isAdmin} />
      <div className="mx-auto grid min-h-screen max-w-[1680px] grid-cols-1 gap-4 p-3 md:grid-cols-[300px_1fr] md:p-4">
        <aside className="rounded-2xl bg-[linear-gradient(180deg,#0b1220,#111a2e)] p-4 text-slate-100 shadow-xl">
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Kothari Furnishing
            </p>
            <h1 className="mt-1 text-xl font-semibold">POS Menu</h1>
            <p className="mt-1 text-xs text-slate-400">
              Press <span className="font-mono">Ctrl+K</span> for Command Launcher
            </p>
          </div>

          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {group.title}
                </p>
                <nav className="space-y-1.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href === '/billing' && pathname === '/pos');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                          active
                            ? 'bg-white/15 text-white shadow'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-medium text-slate-200">
              {user?.name || user?.email || 'User'}
            </p>
            <p className="text-slate-400">{user?.role || 'STAFF'}</p>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h2>
              <p className="text-xs text-slate-500">Business workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Gateway
              </button>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </header>
          <section className="flex-1 p-4 md:p-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
