import { NextRequest } from 'next/server';
import { PrismaClient, Unit } from '@prisma/client';
import { z } from 'zod';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/app/lib/error-handler';
import { extractAuthUser } from '@/app/lib/validation';
import { requireRole } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

const UpdatePayload = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.nativeEnum(Unit).optional(),
  basePrice: z.coerce.number().positive().optional(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  taxRateId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (Number.isNaN(id)) return validationErrorResponse('Invalid product id');

  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { taxRate: true, inventory: true },
  });

  if (!product) return notFoundResponse('Product not found');
  return successResponse(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (Number.isNaN(id)) return validationErrorResponse('Invalid product id');

  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) return forbiddenResponse('Only administrators can edit products');

  const body = await req.json();
  const parsed = UpdatePayload.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid product update', details);
  }

  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return notFoundResponse('Product not found');

  if (parsed.data.sku && parsed.data.sku !== exists.sku) {
    const skuExists = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
    if (skuExists) return validationErrorResponse('Another product already uses this SKU');
  }

  if (parsed.data.taxRateId) {
    const tax = await prisma.taxRate.findUnique({ where: { id: parsed.data.taxRateId } });
    if (!tax) return notFoundResponse('Tax rate not found');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  return successResponse(updated, 'Product updated successfully');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (Number.isNaN(id)) return validationErrorResponse('Invalid product id');

  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) return forbiddenResponse('Only administrators can deactivate products');

  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return notFoundResponse('Product not found');

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return successResponse(updated, 'Product deactivated successfully');
}
