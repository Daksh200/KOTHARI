import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if users exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    // Check roles
    const roles = await prisma.role.findMany();

    return NextResponse.json({
      database: 'connected',
      users: users,
      roles: roles,
      userCount: users.length
    });
  } catch (error: any) {
    return NextResponse.json({
      database: 'disconnected',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
