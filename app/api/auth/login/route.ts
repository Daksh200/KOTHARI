/**
 * POST /api/auth/login
 * Simple login - checks hardcoded credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/app/lib/auth-utils';

// Simple hardcoded credentials
const VALID_USERS = [
  { email: 'admin@furnish.local', password: 'Admin@1234', name: 'Admin', role: 'ADMIN' },
  { email: 'staff@furnish.local', password: 'Staff@1234', name: 'Staff', role: 'STAFF' },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find matching user
    const user = VALID_USERS.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.role === 'ADMIN' ? 1 : 2,
      email: user.email,
      roleId: 1,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.role === 'ADMIN' ? 1 : 2,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
