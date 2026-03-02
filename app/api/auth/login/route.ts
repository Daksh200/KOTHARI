/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns JWT token on success
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, generateToken } from '@/app/lib/auth-utils';

const prisma = new PrismaClient();

interface LoginPayload {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password }: LoginPayload = await req.json();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Fetch user with role
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
    });

    // Log login attempt
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.id,
        action: 'LOGIN',
        performedById: user.id,
        meta: {
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
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
