import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/app/lib/error-handler';
import { isDemoMode } from '@/app/lib/demo-auth';

const prisma = new PrismaClient();

// Demo customers for search
const DEMO_CUSTOMERS = [
  { id: 1, name: 'John Doe', phone: '9876543210' },
  { id: 2, name: 'Jane Smith', phone: '9876543211' },
  { id: 3, name: 'Raj Patel', phone: '9876543212' },
  { id: 4, name: 'Amit Kumar', phone: '9876543213' },
  { id: 5, name: 'Suresh Iyer', phone: '9876543214' },
];

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  const query = new URL(req.url).searchParams.get('query')?.trim() || '';
  if (query.length < 2) {
    return validationErrorResponse('Search query must be at least 2 characters');
  }

  // Return demo customers in demo mode
  if (isDemoMode()) {
    const filteredCustomers = DEMO_CUSTOMERS.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.phone.includes(query)
    );
    return successResponse({ customers: filteredCustomers, total: filteredCustomers.length, query });
  }

  try {
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
