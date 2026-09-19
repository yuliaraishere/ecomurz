import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import type { AuthUser, UserRole } from '../types';

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    // Resolve authoritative application user role from PostgreSQL
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const role: UserRole = (dbUser?.role as UserRole) || 'CUSTOMER';

    return {
      id: user.id,
      email: user.email,
      role,
      fullName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0],
      createdAt: user.created_at,
    };
  } catch (error) {
    console.error('[Auth] Failed to get current user:', error);
    return null;
  }
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

