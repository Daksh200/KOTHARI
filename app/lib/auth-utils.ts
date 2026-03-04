/**
 * Authentication Utility Functions
 * Password hashing, JWT generation/verification
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export interface JWTPayload {
  userId: number | string;
  email: string;
  roleId: number | string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash password using bcryptjs
 * @param password Plain text password
 * @returns Hashed password ready for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password with hash
 * @param password Plain text password from user input
 * @param hash Stored hash from database
 * @returns True if match, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * @param payload User data to encode
 * @returns JWT token string
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode JWT token
 * @param token JWT string from Authorization header
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return decoded as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader Authorization header value
 * @returns Token string or null
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Validation result with errors array
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
