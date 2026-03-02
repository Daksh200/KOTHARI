/**
 * POST /api/auth/register
 * Register a new user (for development purposes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  roleName: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, roleName }: RegisterPayload = await req.json();

    // Validate input
    if (!email || !password || !name || !roleName) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Get or create role
    let role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          permissions: roleName === 'ADMIN' ? { full: true } : { billing: true },
        },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        roleId: role.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: role.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
