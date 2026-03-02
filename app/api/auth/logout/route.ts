/**
 * POST /api/auth/logout
 * Logout user (in JWT, mainly frontend responsibility to clear token)
 * Can be used to log the logout event
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      const unauthResponse = NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
      unauthResponse.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return unauthResponse;
    }

    // Log logout event for audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.userId,
        action: 'LOGOUT',
        performedById: user.userId,
        meta: {
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
