import { getCurrentUser } from './current-user';
import type { AuthUser } from '../types';

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Admin privileges required') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Server-authoritative check verifying that the current session belongs to an ADMIN user.
 * Never trusts client input or cookies; validates against PostgreSQL User.role.
 * Throws UnauthorizedError if not logged in, or ForbiddenError if not an ADMIN.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('UNAUTHORIZED');
  }

  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('FORBIDDEN');
  }

  return user;
}

/**
 * Safe boolean check for conditionally rendering admin links or UI hints.
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}
