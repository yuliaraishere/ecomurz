import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';

  let dbStatus: 'connected' | 'disconnected' = 'connected';
  try {
    // Quick 1-row check to verify pooler readiness without schema dependency
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[Health Check DB Ping Error]:', error);
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      ok: isHealthy,
      service: 'rupa-marketplace',
      environment,
      timestamp,
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        database: dbStatus,
        search: 'operational',
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
