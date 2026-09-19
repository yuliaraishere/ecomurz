'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProductAction } from '@/features/catalog/actions/admin-catalog-actions';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: 'daging & unggas',
    price: 500,
    sku: '',
    slug: '',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    initialStock: 20,
    status: 'ACTIVE' as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createProductAction({
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      price: Number(formData.price),
      sku: formData.sku,
      slug: formData.slug || undefined,
      image: formData.image,
      initialStock: Number(formData.initialStock),
      status: formData.status,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to create product');
    } else {
      router.push('/admin/products');
      router.refresh();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Products
        </Link>
        <h1 className="text-xl font-bold">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        {error && (
          <div className="p-3 bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name (Default / ID) *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sambal Terasi Super"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
            <Input
              id="sku"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. RUPA-SAMBAL-001"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            rows={3}
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed product information..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (JPY) *</Label>
            <Input
              id="price"
              type="number"
              min={0}
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialStock">Initial Stock *</Label>
            <Input
              id="initialStock"
              type="number"
              min={0}
              required
              value={formData.initialStock}
              onChange={(e) =>
                setFormData({ ...formData, initialStock: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <select
              id="status"
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category ID *</Label>
            <Input
              id="categoryId"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              placeholder="e.g. daging & unggas, bumbu & rempah"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Custom URL Slug (optional)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Leave blank to auto-generate"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Product
          </Button>
        </div>
      </form>
    </div>
  );
}
