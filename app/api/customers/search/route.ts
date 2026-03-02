import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/app/lib/error-handler';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const query = new URL(req.url).searchParams.get('query')?.trim() || '';
    if (query.length < 2) {
      return validationErrorResponse('Search query must be at least 2 characters');
    }

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    return successResponse({ customers, total: customers.length, query });
  } finally {
    await prisma.$disconnect();
  }
}
