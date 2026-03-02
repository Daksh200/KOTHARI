import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import { validationErrorResponse } from './error-handler';

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validates request body against Zod schema
 * Returns parsed data if valid, NextResponse error if invalid
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema
): Promise<T> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return validated as T;
  } catch (error) {
    throw error; // Let error handler catch it
  }
}

/**
 * Validates query parameters against Zod schema
 * Returns parsed data if valid, throws if invalid
 */
export function validateQueryParams<T>(
  params: Record<string, any>,
  schema: ZodSchema
): T {
  const validated = schema.parse(params);
  return validated as T;
}

// ============================================================================
// TRY-CATCH WRAPPER FOR API ROUTES
// ============================================================================

/**
 * Wrap async API route handlers with centralized error handling
 * Usage:
 * export const POST = withErrorHandling(async (req) => { ... })
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const { response, logContext } = require('./error-handler').buildErrorResponse(error);
      // Log error with context (can be extended to Sentry, CloudWatch, etc.)
      console.error('[API Error]', logContext);
      return response;
    }
  };
}

// ============================================================================
// MIDDLEWARE FOR EXTRACTING & VALIDATING USER FROM JWT
// ============================================================================

export async function extractAuthUser(request: NextRequest) {
  const { requireAuth } = require('./auth-middleware');
  const user = await requireAuth(request);
  
  if (!user) {
    const { unauthorizedResponse } = require('./error-handler');
    return { user: null, response: unauthorizedResponse() };
  }

  return { user, response: null };
}

// ============================================================================
// MIDDLEWARE FOR ROLE-BASED ACCESS
// ============================================================================

export async function checkUserRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const { requireRole } = require('./auth-middleware');
  const hasRole = await requireRole(request, allowedRoles);

  if (!hasRole) {
    const { forbiddenResponse } = require('./error-handler');
    return { authorized: false, response: forbiddenResponse('Insufficient permissions') };
  }

  return { authorized: true, response: null };
}

// ============================================================================
// PAGINATION EXTRACTOR
// ============================================================================

export function extractPagination(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    skip: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
  };
}

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a value is a positive integer
 */
export function validatePositiveInt(value: any, fieldName: string): number {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return num;
}

/**
 * Validates that a value is a non-negative number
 */
export function validateNonNegativeNumber(value: any, fieldName: string): number {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return num;
}

/**
 * Validates array of items is not empty
 */
export function validateArrayNotEmpty<T>(array: T[], fieldName: string): T[] {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error(`${fieldName} must contain at least one item`);
  }
  return array;
}
