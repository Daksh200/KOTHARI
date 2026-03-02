import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UpdateCustomerSchema } from '@/app/lib/schemas';
import {
  successResponse,
  validationErrorResponse,
  NotFoundError,
} from '@/app/lib/error-handler';
import { withErrorHandling, extractAuthUser } from '@/app/lib/validation';

const prisma = new PrismaClient();

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/customers/[id]
 * Get single customer details with payment history
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const { id } = await params;
    const customerId = parseInt(id);

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
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const { id } = await params;
    const customerId = parseInt(id);

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
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  // Check auth
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  try {
    const { id } = await params;
    const customerId = parseInt(id);

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
