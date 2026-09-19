import { NextResponse } from 'next/server';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/features/auth/services/require-admin';
import { csvExportService, type ExportType } from '@/features/analytics/services/csv-export-service';

export const dynamic = 'force-dynamic';

const VALID_EXPORT_TYPES: Set<string> = new Set([
  'sales',
  'products',
  'orders',
  'refunds',
  'inventory',
  'promotions',
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    // 1. Enforce strict server-authoritative admin authorization
    await requireAdmin();

    // 2. Validate route parameter
    const { type } = await params;
    if (!VALID_EXPORT_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid export type. Supported types: ${Array.from(VALID_EXPORT_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    // 3. Extract and sanitize query filters
    const url = new URL(request.url);
    const period = url.searchParams.get('period');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    const categoryId = url.searchParams.get('categoryId');
    const productId = url.searchParams.get('productId');

    // 4. Generate CSV payload with formula injection mitigation
    const { filename, content } = await csvExportService.generateExport(type as ExportType, {
      period,
      startDate,
      endDate,
      status,
      categoryId,
      productId,
    });

    // 5. Return downloadable CSV response
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[Analytics Export Error]:', error);
    return NextResponse.json(
      { error: 'Failed to generate export', details: error?.message },
      { status: 500 }
    );
  }
}
