import { requireAdmin } from '@/features/auth/services/require-admin';
import { adminCatalogRepository } from '@/features/catalog/repositories/admin-catalog-repository';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit3, ArrowUpDown, Package, Layers } from 'lucide-react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const sp = await searchParams;
  const statusFilter = typeof sp.status === 'string' ? sp.status : 'all';
  const categoryFilter = typeof sp.category === 'string' ? sp.category : 'all';
  const searchQuery = typeof sp.q === 'string' ? sp.q : '';

  const { products, total } = await adminCatalogRepository.listProducts({
    status: statusFilter,
    categoryId: categoryFilter,
    search: searchQuery,
  });

  const categories = await adminCatalogRepository.listCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products & Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store's multi-lingual product catalog, SKU, pricing, and lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form method="GET" className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by name, SKU, or slug..."
              className="pl-9 h-9"
            />
          </div>
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
          {categoryFilter !== 'all' && <input type="hidden" name="category" value={categoryFilter} />}
          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Search
          </Button>
        </form>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((s) => {
            const isActive = statusFilter === s;
            const href = `?status=${s}${categoryFilter !== 'all' ? `&category=${categoryFilter}` : ''}${
              searchQuery ? `&q=${searchQuery}` : ''
            }`;
            return (
              <Link
                key={s}
                href={href}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s === 'all' ? 'All Products' : s}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
          <span className="text-sm font-medium">
            Showing {products.length} of {total} products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU / Slug</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Available Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted flex-shrink-0 relative">
                            {p.image ? (
                              <img src={p.image} alt={p.name || ''} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 m-auto text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{p.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-medium">{p.sku}</div>
                        <div className="text-xs text-muted-foreground">/{p.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-normal">
                          {p.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ¥{p.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            p.availableQty === 0
                              ? 'text-destructive'
                              : p.availableQty <= 5
                              ? 'text-amber-600'
                              : 'text-foreground'
                          }`}
                        >
                          {p.availableQty}
                        </span>
                        {p.reservedQty > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({p.reservedQty} held)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            p.status === 'ACTIVE'
                              ? 'default'
                              : p.status === 'DRAFT'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                          {p.status === 'ACTIVE' && (
                            <a
                              href={`/products/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
