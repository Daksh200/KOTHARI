import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  PaginationSchema,
} from '@/app/lib/schemas';
import {
  successResponse,
  validationErrorResponse,
  NotFoundError,
  ConflictError,
} from '@/app/lib/error-handler';
import { withErrorHandling, extractAuthUser, extractPagination } from '@/app/lib/validation';

const prisma = new PrismaClient();

/**
 * POST /api/customers
 * Create new customer
 * Requires: Authentication (ADMIN or STAFF)
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

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

/**
 * GET /api/customers/[id]
 * Get single customer details with payment history
 */
export async function getCustomer(req: NextRequest, { params }: { params: { id: string } }) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const customerId = parseInt(params.id);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: true,
            payments: true,
          },
        },
        advances: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return successResponse(customer);
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/customers/[id]
 * Update customer details
 * Requires: Authentication
 */
export async function updateCustomer(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const customerId = parseInt(params.id);

    // Validate request
    const body = await req.json();
    const validation = UpdateCustomerSchema.safeParse(body);

    if (!validation.success) {
      const details = validation.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return validationErrorResponse('Invalid customer data', details);
    }

    const data = validation.data;

    // Update customer
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.gstin && { gstin: data.gstin }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.pincode && { pincode: data.pincode }),
        ...(data.state && { state: data.state }),
        ...(data.customerType && { customerType: data.customerType }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      } as any,
    });

    return successResponse(customer, 'Customer updated successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('No Customer found')) {
      throw new NotFoundError('Customer not found');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/customers/[id]
 * Soft delete customer (mark as inactive)
 * Requires: ADMIN role
 * 
 * Note: Hard delete is prevented if customer has invoice history
 */
export async function deleteCustomer(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const customerId = parseInt(params.id);

    // Check if customer has invoices
    const invoiceCount = await prisma.invoice.count({
      where: { customerId },
    });

    if (invoiceCount > 0) {
      const { errorResponse } = require('@/app/lib/error-handler');
      return errorResponse(
        400,
        'Cannot delete customer with invoice history. Mark as inactive instead.',
        'CUSTOMER_HAS_INVOICES'
      );
    }

    // Soft delete
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false } as any,
    });

    return successResponse(customer, 'Customer deactivated successfully');
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/customers/search?query=name
 * Fast customer search for invoice creation
 */
export async function searchCustomer(req: NextRequest) {
  try {
    const query = new URL(req.url).searchParams.get('query') || '';

    if (query.length < 2) {
      const { validationErrorResponse } = require('@/app/lib/error-handler');
      return validationErrorResponse('Search query must be at least 2 characters');
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      } as any,
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        customerType: true,
        gstin: true,
      } as any,
    });

    return successResponse({
      total: customers.length,
      customers,
      query,
    });
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
