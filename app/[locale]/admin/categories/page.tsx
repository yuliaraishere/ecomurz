import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminCatalogRepository } from '@/features/catalog/repositories/admin-catalog-repository';
import { setRequestLocale } from 'next-intl/server';
import { CategoriesClient } from './categories-client';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const categories = await adminCatalogRepository.listCategories();

  return (
    <div className="max-w-5xl mx-auto">
      <CategoriesClient categories={categories} />
    </div>
  );
}
