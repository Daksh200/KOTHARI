import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  CreateCustomerSchema,
  PaginationSchema,
} from '@/app/lib/schemas';
import {
  successResponse,
  validationErrorResponse,
  ConflictError,
  forbiddenResponse,
} from '@/app/lib/error-handler';
import { withErrorHandling, extractAuthUser, extractPagination } from '@/app/lib/validation';
import { isDemoMode } from '@/app/lib/demo-auth';

const prisma = new PrismaClient();

// Demo customers for demonstration
const DEMO_CUSTOMERS = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '9876543210', city: 'Mumbai', totalAdvanceBalance: 5000, createdAt: new Date() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '9876543211', city: 'Delhi', totalAdvanceBalance: 2500, createdAt: new Date() },
  { id: 3, name: 'Raj Patel', email: 'raj@example.com', phone: '9876543212', city: 'Ahmedabad', totalAdvanceBalance: 0, createdAt: new Date() },
  { id: 4, name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543213', city: 'Bangalore', totalAdvanceBalance: 10000, createdAt: new Date() },
  { id: 5, name: 'Suresh Iyer', email: 'suresh@example.com', phone: '9876543214', city: 'Chennai', totalAdvanceBalance: 1500, createdAt: new Date() },
];

/**
 * POST /api/customers
 * Create new customer
 * Requires: Authentication (ADMIN or STAFF)
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  // Demo mode - deny creation
  if (isDemoMode()) {
    return forbiddenResponse('Customer creation is disabled in demo mode');
  }

  // Validate request
  const body = await req.json();
  const validation = CreateCustomerSchema.safeParse(body);

  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid customer data', details);
  }

  const data = validation.data;

  try {
    // Check if customer with same phone/email already exists
    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [{ email: data.email }, { phone: data.phone }],
        },
      });

      if (existing) {
        throw new ConflictError('Customer with this email or phone already exists');
      }
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        gstin: data.gstin || null,
        address: data.address || null,
        city: data.city || null,
        pincode: data.pincode || null,
        state: data.state || null,
        customerType: data.customerType,
      } as any, // cast until Prisma client is regenerated
    });

    return successResponse(customer, 'Customer created successfully', 201);
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
});

/**
 * GET /api/customers?page=1&limit=20
 * List all customers with pagination
 * Requires: Authentication
 */
export async function GET(req: NextRequest) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  // Return demo customers in demo mode
  if (isDemoMode()) {
    return successResponse({
      total: DEMO_CUSTOMERS.length,
      page: 1,
      limit: 20,
      customers: DEMO_CUSTOMERS,
    });
  }

  try {
    // Extract pagination
    const { page, limit, skip } = extractPagination(new URL(req.url));

    // Get total count
    const total = await prisma.customer.count();

    // Get customers
    const customers = await prisma.customer.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 payments
        },
      },
    });

    // Calculate total advance for each customer
    const customersWithAdvance = await Promise.all(
      customers.map(async (c) => {
        const advancePayments = await prisma.advancePayment.findMany({
          where: { customerId: c.id },
        });

        const totalAdvance = advancePayments.reduce((sum, ap) => sum + ap.amount, 0);

        return {
          ...c,
          totalAdvanceBalance: totalAdvance,
        };
      })
    );

    return successResponse({
      total,
      page,
      limit,
      customers: customersWithAdvance,
    });
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
