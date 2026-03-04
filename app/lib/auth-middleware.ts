/**
 * Authentication Middleware
 * Verify JWT tokens and extract user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, extractToken, JWTPayload } from '@/app/lib/auth-utils';
import { getDemoRole, isDemoMode } from '@/app/lib/demo-auth';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware function to verify JWT in API routes
 * Usage in route handler:
 *   export async function POST(req: NextRequest) {
 *     const user = await requireAuth(req);
 *     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *     // use user.userId, user.email, user.roleId
 *   }
 */
export async function requireAuth(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get('Authorization');
  let token = extractToken(authHeader ?? undefined);
  if (!token) {
    token = req.cookies.get('auth_token')?.value || null;
  }

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Verify user has specific role
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<boolean> {
  const user = await requireAuth(req);

  if (!user) {
    return false;
  }

  // In demo mode, use demo roles
  if (isDemoMode()) {
    const demoRole = getDemoRole(user.roleId);
    if (!demoRole) {
      return false;
    }
    return allowedRoles.map((r) => r.toUpperCase()).includes(demoRole.name.toUpperCase());
  }

  // In production mode, use database roles
  const role = await prisma.role.findUnique({
    where: { id: Number(user.roleId) },
    select: { name: true },
  });

  if (!role) {
    return false;
  }

  return allowedRoles.map((r) => r.toUpperCase()).includes(role.name.toUpperCase());
}

/**
 * Unauthorized response helper
 */
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Forbidden response helper
 */
export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}
