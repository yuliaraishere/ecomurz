'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
  restoreCategoryAction,
  deleteCategoryAction,
} from '@/features/catalog/actions/admin-catalog-actions';
import { Plus, Archive, RotateCcw, Trash2, Edit2, Loader2, AlertCircle, Save } from 'lucide-react';
import type { AdminCategoryItem } from '@/features/catalog/repositories/admin-catalog-repository';

interface CategoriesClientProps {
  categories: AdminCategoryItem[];
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Category Form state
  const [showCreate, setShowCreate] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await createCategoryAction({
      name: newCatName,
      slug: newCatSlug || undefined,
      description: newCatDesc || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create category' });
    } else {
      setMessage({ type: 'success', text: 'Category created successfully' });
      setShowCreate(false);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      router.refresh();
    }
  };

  const handleStartEdit = (cat: AdminCategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug || '');
    setEditDesc(cat.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setMessage(null);

    const res = await updateCategoryAction({
      categoryId: editingId,
      name: editName,
      slug: editSlug || undefined,
      description: editDesc || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to update category' });
    } else {
      setMessage({ type: 'success', text: 'Category updated successfully' });
      setEditingId(null);
      router.refresh();
    }
  };

  const handleArchive = async (id: string) => {
    setLoading(true);
    const res = await archiveCategoryAction(id);
    setLoading(false);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Archive failed' });
    else router.refresh();
  };

  const handleRestore = async (id: string) => {
    setLoading(true);
    const res = await restoreCategoryAction(id);
    setLoading(false);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Restore failed' });
    else router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setLoading(true);
    const res = await deleteCategoryAction(id);
    setLoading(false);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Delete failed' });
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize products into hierarchical or grouped taxonomy.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {showCreate ? 'Close Form' : 'Add Category'}
        </Button>
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

      {/* Create Category Modal / Drawer */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold">New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Category Name *</Label>
              <Input
                id="catName"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Minuman Tradisional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catSlug">URL Slug (optional)</Label>
              <Input
                id="catSlug"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                placeholder="auto-generated from name if empty"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="catDesc">Description</Label>
            <Textarea
              id="catDesc"
              rows={2}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Category
            </Button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b uppercase text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Category Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-center">Products</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;

              if (isEditing) {
                return (
                  <tr key={cat.id} className="bg-muted/20">
                    <td colSpan={5} className="p-4">
                      <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Slug</Label>
                            <Input
                              value={editSlug}
                              onChange={(e) => setEditSlug(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            rows={2}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={loading}>
                            Save
                          </Button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={cat.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {cat.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    /{cat.slug || cat.id}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="text-xs">
                      {cat.productCount} products
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={cat.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-[10px] uppercase"
                    >
                      {cat.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(cat)}
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {cat.status === 'ACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(cat.id)}
                          disabled={loading}
                        >
                          <Archive className="h-4 w-4 text-amber-500" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(cat.id)}
                          disabled={loading}
                        >
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {cat.productCount === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cat.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
