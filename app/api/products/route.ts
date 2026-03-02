import { NextRequest } from 'next/server';
import { PrismaClient, Unit } from '@prisma/client';
import { z } from 'zod';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/app/lib/error-handler';
import { withErrorHandling, extractAuthUser } from '@/app/lib/validation';
import { requireRole } from '@/app/lib/auth-middleware';

const prisma = new PrismaClient();

const CreateProductPayload = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.nativeEnum(Unit).default(Unit.PIECE),
  basePrice: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  taxRateId: z.coerce.number().int().positive().optional().nullable(),
});

/**
 * GET /api/products?page=1&limit=50
 * List products for product management and billing
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        taxRate: true,
        inventory: {
          select: {
            totalQuantity: true,
          },
          take: 1,
        },
      },
    }),
  ]);

  return successResponse({
    total,
    page,
    limit,
    products: items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      costPrice: item.costPrice,
      basePrice: item.basePrice,
      gstRate: item.taxRate?.percentage ?? 0,
      taxRateId: item.taxRateId,
      unit: item.unit,
      stock: item.inventory[0]?.totalQuantity ?? 0,
      isActive: item.isActive,
    })),
  });
});

/**
 * POST /api/products
 * Create product (ADMIN only)
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { user, response } = await extractAuthUser(req);
  if (!user) return response;

  const isAdmin = await requireRole(req, ['ADMIN']);
  if (!isAdmin) return forbiddenResponse('Only administrators can create products');

  const body = await req.json();
  const validation = CreateProductPayload.safeParse(body);
  if (!validation.success) {
    const details = validation.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return validationErrorResponse('Invalid product data', details);
  }

  const data = validation.data;

  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) {
    return validationErrorResponse('Product with this SKU already exists');
  }

  if (data.taxRateId) {
    const taxRate = await prisma.taxRate.findUnique({ where: { id: data.taxRateId } });
    if (!taxRate) return notFoundResponse('Tax rate not found');
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      category: data.category || null,
      description: data.description || null,
      unit: data.unit,
      basePrice: data.basePrice,
      costPrice: data.costPrice ?? null,
      taxRateId: data.taxRateId ?? null,
      isActive: true,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      productId: product.id,
      totalQuantity: 0,
      rollTotalMeters: 0,
      rollRemainingMeters: 0,
      location: 'Main Store',
    },
  });

  return successResponse(product, 'Product created successfully', 201);
});
