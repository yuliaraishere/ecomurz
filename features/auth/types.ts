export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  createdAt?: string;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
  requiresEmailConfirmation?: boolean;
  email?: string;
}

