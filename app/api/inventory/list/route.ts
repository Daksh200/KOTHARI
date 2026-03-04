import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/app/lib/auth-middleware';
import { successResponse, unauthorizedResponse } from '@/app/lib/error-handler';
import { isDemoMode } from '@/app/lib/demo-auth';

const prisma = new PrismaClient();

// Demo inventory items for demonstration
const DEMO_INVENTORY = [
  { id: 1, productId: 1, name: 'Wooden Chair', sku: 'CHR001', category: 'Furniture', balance: 25, alert: 'OK', location: 'Main Store' },
  { id: 2, productId: 2, name: 'Dining Table', sku: 'TBL001', category: 'Furniture', balance: 8, alert: 'OK', location: 'Main Store' },
  { id: 3, productId: 3, name: 'Sofa Set', sku: 'SOF001', category: 'Furniture', balance: 3, alert: 'LOW', location: 'Main Store' },
  { id: 4, productId: 4, name: 'Book Shelf', sku: 'SHF001', category: 'Furniture', balance: 12, alert: 'OK', location: 'Main Store' },
  { id: 5, productId: 5, name: 'TV Unit', sku: 'TVU001', category: 'Furniture', balance: 5, alert: 'LOW', location: 'Warehouse' },
];

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  // Return demo inventory in demo mode
  if (isDemoMode()) {
    return successResponse({ items: DEMO_INVENTORY });
  }

  try {
    const rows = await prisma.inventoryItem.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });

    const data = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      name: row.product.name,
      sku: row.product.sku,
      category: row.product.category,
      in: null,
      out: null,
      balance: row.totalQuantity,
      alert: row.totalQuantity <= 5 ? 'LOW' : 'OK',
      location: row.location,
    }));

    return successResponse({ items: data });
  } finally {
    await prisma.$disconnect();
  }
}
