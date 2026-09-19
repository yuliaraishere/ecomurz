import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Idempotently ensures that a User record exists in the application database
 * corresponding to the authenticated Supabase user ID.
 */
export async function ensureUserExists(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ id: string }> {
  if (!userId) {
    throw new Error('User ID is required to ensure user record');
  }

  return client.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}
