import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public details?: any) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Conflict') {
    super(409, message, 'CONFLICT');
  }
}

export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
  }
}

export class InsufficientStockError extends APIError {
  public readonly availableQty: number;
  public readonly requestedQty: number;

  constructor(message: string, availableQty: number, requestedQty: number) {
    super(400, message, 'INSUFFICIENT_STOCK');
    this.availableQty = availableQty;
    this.requestedQty = requestedQty;
  }
}

export class PaymentValidationError extends APIError {
  constructor(message: string, public readonly totalRequired?: number, public readonly totalPaid?: number) {
    super(400, message, 'PAYMENT_VALIDATION_ERROR');
  }
}

export class InventoryLockError extends APIError {
  constructor(message: string = 'Failed to lock inventory for transaction') {
    super(500, message, 'INVENTORY_LOCK_ERROR');
  }
}

export class TransactionError extends APIError {
  constructor(message: string = 'Transaction failed') {
    super(500, message, 'TRANSACTION_ERROR');
  }
}

// ============================================================================
// ERROR HANDLER UTILITY
// ============================================================================

export function handleError(error: unknown): {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
} {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: formattedErrors,
    };
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      errorCode: error.code || 'API_ERROR',
      message: error.message,
      details: error instanceof ValidationError ? error.details : undefined,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    };
  }

  console.error('Unknown error:', error);
  return {
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  errorCode?: string;
  details?: any;
  timestamp: string;
}

export function successResponse<T>(
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function errorResponse(
  statusCode: number = 500,
  message: string = 'Internal server error',
  errorCode: string = 'INTERNAL_SERVER_ERROR',
  details?: any
): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      success: false,
      statusCode,
      message,
      error: message,
      errorCode,
      details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function validationErrorResponse(
  message: string = 'Validation failed',
  details?: any
): NextResponse<APIResponse> {
  return errorResponse(400, message, 'VALIDATION_ERROR', details);
}

export function notFoundResponse(
  message: string = 'Resource not found'
): NextResponse<APIResponse> {
  return errorResponse(404, message, 'NOT_FOUND');
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<APIResponse> {
  return errorResponse(401, message, 'UNAUTHORIZED');
}

export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<APIResponse> {
  return errorResponse(403, message, 'FORBIDDEN');
}

// ============================================================================
// ERROR RESPONSE BUILDER WITH CONTEXT
// ============================================================================

export function buildErrorResponse(error: unknown): {
  response: NextResponse<APIResponse>;
  logContext: any;
} {
  const errorInfo = handleError(error);
  const response = errorResponse(
    errorInfo.statusCode,
    errorInfo.message,
    errorInfo.errorCode,
    errorInfo.details
  );

  return {
    response,
    logContext: {
      statusCode: errorInfo.statusCode,
      errorCode: errorInfo.errorCode,
      message: errorInfo.message,
      details: errorInfo.details,
      timestamp: new Date().toISOString(),
    },
  };
}
