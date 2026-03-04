/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns JWT token on success
 * 
 * Demo mode: Use admin@furnish.local / Admin@1234 or staff@furnish.local / Staff@1234
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/app/lib/auth-utils';
import { verifyDemoUser, isDemoMode } from '@/app/lib/demo-auth';

interface LoginPayload {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let prisma = null;
  
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

    // Check if demo mode is enabled
    const demoMode = isDemoMode();
    
    let user = null;
    let userRole = null;

    if (demoMode) {
      // Use demo authentication
      console.log('Using demo mode for login');
      const demoUser = await verifyDemoUser(normalizedEmail, password);
      if (demoUser) {
        user = demoUser;
        userRole = { name: demoUser.role };
      }
    } else {
      // Use database authentication - import PrismaClient only when needed
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient();
      
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { role: true },
      });
      
      if (user) {
        userRole = user.role;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For database mode, check if user is active
    if (!demoMode && 'isActive' in user && !user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // For database mode, verify password
    if (!demoMode && prisma && 'passwordHash' in user) {
      const passwordMatch = await verifyPassword(password, user.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Update lastLogin
      await prisma.user.update({
        where: { id: user.id as number },
        data: { lastLogin: new Date() },
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      role: userRole?.name || 'STAFF',
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: userRole?.name || 'STAFF',
        },
        demoMode,
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
  } finally {
    // Disconnect prisma if it was created
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}
