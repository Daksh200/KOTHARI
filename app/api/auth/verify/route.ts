/**
 * POST /api/auth/verify
 * Verify JWT token validity
 * Used by frontend to check if session is still active
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorized } from '@/app/lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return unauthorized('Invalid or expired token');
    }

    return NextResponse.json(
      {
        valid: true,
        user: {
          userId: user.userId,
          email: user.email,
          roleId: user.roleId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Token verify error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
