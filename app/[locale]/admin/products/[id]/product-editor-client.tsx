'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  updateProductAction,
  archiveProductAction,
  restoreProductAction,
  deleteProductAction,
  adjustInventoryAction,
} from '@/features/catalog/actions/admin-catalog-actions';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/features/catalog/domain/locale';
import {
  Save,
  Archive,
  RotateCcw,
  Trash2,
  Boxes,
  History,
  Languages,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { AdminProductDetail } from '@/features/catalog/repositories/admin-catalog-repository';

interface ProductEditorClientProps {
  product: AdminProductDetail;
}

export function ProductEditorClient({ product }: ProductEditorClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'translations' | 'stock' | 'history'>('general');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General fields
  const [sku, setSku] = useState(product.sku || '');
  const [slug, setSlug] = useState(product.slug || '');
  const [price, setPrice] = useState(product.price);
  const [priceReason, setPriceReason] = useState('');
  const [image, setImage] = useState(product.image);
  const [accent, setAccent] = useState(product.accent || '');

  // Translations
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>(() => {
    const init: Record<string, { name: string; description: string }> = {};
    for (const loc of SUPPORTED_LOCALES) {
      init[loc] = {
        name: product.localizedContent[loc]?.name || '',
        description: product.localizedContent[loc]?.description || '',
      };
    }
    return init;
  });
  const [selectedLocale, setSelectedLocale] = useState<string>(DEFAULT_LOCALE);

  // Stock adjustment
  const [stockDelta, setStockDelta] = useState<number>(0);
  const [stockReason, setStockReason] = useState('');

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateProductAction({
      productId: product.id,
      sku,
      slug,
      price: Number(price),
      priceChangeReason: priceReason || undefined,
      image,
      accent: accent || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to update' });
    } else {
      setMessage({ type: 'success', text: 'Product updated successfully.' });
      setPriceReason('');
      router.refresh();
    }
  };

  const handleSaveTranslations = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateProductAction({
      productId: product.id,
      translations,
    });

    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to save translations' });
    } else {
      setMessage({ type: 'success', text: 'Translations saved successfully.' });
      router.refresh();
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockDelta === 0) return;
    setLoading(true);
    setMessage(null);

    const res = await adjustInventoryAction({
      productId: product.id,
      adjustment: stockDelta,
      reason: stockReason || 'Manual admin inventory adjustment',
    });

    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to adjust stock' });
    } else {
      setMessage({ type: 'success', text: `Stock adjusted by ${stockDelta > 0 ? '+' : ''}${stockDelta}.` });
      setStockDelta(0);
      setStockReason('');
      router.refresh();
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this product? Customers will no longer be able to see or buy it.')) return;
    setLoading(true);
    setMessage(null);
    const res = await archiveProductAction(product.id);
    setLoading(false);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Archive failed' });
    else router.refresh();
  };

  const handleRestore = async () => {
    setLoading(true);
    setMessage(null);
    const res = await restoreProductAction(product.id);
    setLoading(false);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Restore failed' });
    else router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This is permanent.')) return;
    setLoading(true);
    setMessage(null);
    const res = await deleteProductAction(product.id);
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Delete failed' });
    } else {
      router.push('/admin/products');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border bg-muted flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name || ''} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{product.name}</h1>
              <Badge
                variant={
                  product.status === 'ACTIVE'
                    ? 'default'
                    : product.status === 'DRAFT'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {product.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
              <span>SKU: <strong className="font-mono">{product.sku}</strong></span>
              <span>Category: <strong>{product.category}</strong></span>
              <span>Orders: <strong>{product.orderItemCount} historical</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {product.status === 'ACTIVE' && (
            <a
              href={`/products/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              View in Store
            </a>
          )}
          {product.status === 'ACTIVE' ? (
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={loading}>
              <Archive className="h-4 w-4 mr-1.5 text-amber-500" />
              Archive Product
            </Button>
          ) : product.status === 'ARCHIVED' ? (
            <Button variant="outline" size="sm" onClick={handleRestore} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-1.5 text-green-500" />
              Restore to Active
            </Button>
          ) : null}
          {product.orderItemCount === 0 ? (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground italic px-2">
              Orders snapshot protected (hard delete disabled)
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'general', label: 'General & Pricing' },
          { id: 'translations', label: 'Multilingual Content' },
          { id: 'stock', label: 'Inventory Adjustment' },
          { id: 'history', label: 'Price History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: General & Pricing */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL identifier) *</Label>
              <Input
                id="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (JPY integer) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
              />
              {price !== product.price && (
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="priceReason" className="text-xs text-amber-600 font-semibold">
                    Reason for Price Change (Logged in Price History) *
                  </Label>
                  <Input
                    id="priceReason"
                    placeholder="e.g. Seasonal supplier discount adjustment"
                    value={priceReason}
                    onChange={(e) => setPriceReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent">Accent Color (Hex)</Label>
              <Input
                id="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#c2785c"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save General Changes
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Multilingual Content */}
      {activeTab === 'translations' && (
        <form onSubmit={handleSaveTranslations} className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                type="button"
                key={loc}
                onClick={() => setSelectedLocale(loc)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase transition-colors ${
                  selectedLocale === loc
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {loc} {loc === DEFAULT_LOCALE && '(Default)'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${selectedLocale}`}>Name ({selectedLocale.toUpperCase()}) *</Label>
              <Input
                id={`name-${selectedLocale}`}
                value={translations[selectedLocale]?.name || ''}
                onChange={(e) =>
                  setTranslations({
                    ...translations,
                    [selectedLocale]: {
                      ...translations[selectedLocale],
                      name: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`desc-${selectedLocale}`}>Description ({selectedLocale.toUpperCase()}) *</Label>
              <Textarea
                id={`desc-${selectedLocale}`}
                rows={4}
                value={translations[selectedLocale]?.description || ''}
                onChange={(e) =>
                  setTranslations({
                    ...translations,
                    [selectedLocale]: {
                      ...translations[selectedLocale],
                      description: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save All Translations
            </Button>
          </div>
        </form>
      )}

      {/* Tab 3: Inventory Adjustment */}
      {activeTab === 'stock' && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-xl">
            <div>
              <span className="text-xs text-muted-foreground">Available Quantity</span>
              <div className="text-2xl font-bold">{product.availableQty}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Reserved Holds</span>
              <div className="text-2xl font-bold text-amber-600">{product.reservedQty}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Physical Units</span>
              <div className="text-2xl font-bold">{product.availableQty + product.reservedQty}</div>
            </div>
          </div>

          <form onSubmit={handleAdjustStock} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold">Manual Stock Adjustment</h3>
            <p className="text-xs text-muted-foreground">
              Adjustments immediately modify authoritative Inventory records and log an audit trail entry.
            </p>

            <div className="space-y-2">
              <Label htmlFor="stockDelta">Adjustment Amount (+/-)</Label>
              <Input
                id="stockDelta"
                type="number"
                value={stockDelta}
                onChange={(e) => setStockDelta(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. +10 or -5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockReason">Adjustment Reason *</Label>
              <Input
                id="stockReason"
                required
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g. Restock shipment received from supplier"
              />
            </div>

            <Button type="submit" disabled={loading || stockDelta === 0}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Boxes className="h-4 w-4 mr-2" />}
              Apply Adjustment
            </Button>
          </form>
        </div>
      )}

      {/* Tab 4: Price History */}
      {activeTab === 'history' && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold">Price Audit Log</h3>
          <p className="text-xs text-muted-foreground">
            Complete immutable record of all price adjustments for this product.
          </p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Previous</th>
                  <th className="px-4 py-2.5">New Price</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.priceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No price history recorded yet.
                    </td>
                  </tr>
                ) : (
                  product.priceHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 font-mono">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">¥{h.previousPrice.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary">
                        ¥{h.newPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{h.reason || '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                        {h.changedBy || 'system'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
