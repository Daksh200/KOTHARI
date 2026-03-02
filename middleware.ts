import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/dashboard',
  '/billing',
  '/pos',
  '/daybook',
  '/products',
  '/inventory',
  '/reports',
  '/admin',
];

const adminOnlyPrefixes = ['/reports', '/admin'];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAdminOnlyPath(pathname: string) {
  return adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function decodeRoleFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as { role?: string };
    return parsed.role ? parsed.role.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth_token')?.value;
  const role = token ? decodeRoleFromToken(token) : null;

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isProtectedPath(pathname) && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', `${pathname}${search || ''}`);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAdminOnlyPath(pathname) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
