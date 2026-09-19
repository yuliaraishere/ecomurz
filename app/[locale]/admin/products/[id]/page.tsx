import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminCatalogRepository } from '@/features/catalog/repositories/admin-catalog-repository';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ProductEditorClient } from './product-editor-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const product = await adminCatalogRepository.getProductById(id);
  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Products
        </Link>
      </div>

      <ProductEditorClient product={product} />
    </div>
  );
}
