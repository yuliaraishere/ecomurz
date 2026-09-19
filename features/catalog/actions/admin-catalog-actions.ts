'use server';

import { requireAdmin } from '@/features/auth/services/require-admin';
import { revalidatePath } from 'next/cache';
import {
  adminCatalogService,
  type CreateProductInput,
  type UpdateProductInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '../services/admin-catalog-service';
import { adjustInventoryService } from '@/features/inventory/services/adjust-inventory-service';

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createProductAction(input: Omit<CreateProductInput, 'adminUserId'>): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const product = await adminCatalogService.createProduct({
      ...input,
      adminUserId: admin.id,
    });
    revalidatePath('/admin/products');
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create product' };
  }
}

export async function updateProductAction(input: Omit<UpdateProductInput, 'adminUserId'>): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const product = await adminCatalogService.updateProduct({
      ...input,
      adminUserId: admin.id,
    });
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${input.productId}`);
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

export async function archiveProductAction(productId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const product = await adminCatalogService.archiveProduct(productId, admin.id);
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to archive product' };
  }
}

export async function restoreProductAction(productId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const product = await adminCatalogService.restoreProduct(productId, admin.id);
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore product' };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const product = await adminCatalogService.deleteProduct(productId, admin.id);
    revalidatePath('/admin/products');
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}

export async function adjustInventoryAction(params: {
  productId: string;
  adjustment: number;
  reason: string;
}): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const result = await adjustInventoryService.adjustInventory({
      productId: params.productId,
      adjustment: params.adjustment,
      reason: params.reason,
      adminUserId: admin.id,
    });
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${params.productId}`);
    revalidatePath('/admin/inventory');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to adjust stock' };
  }
}

// Category Actions

export async function createCategoryAction(input: Omit<CreateCategoryInput, 'adminUserId'>): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const category = await adminCatalogService.createCategory({
      ...input,
      adminUserId: admin.id,
    });
    revalidatePath('/admin/categories');
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create category' };
  }
}

export async function updateCategoryAction(input: Omit<UpdateCategoryInput, 'adminUserId'>): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const category = await adminCatalogService.updateCategory({
      ...input,
      adminUserId: admin.id,
    });
    revalidatePath('/admin/categories');
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update category' };
  }
}

export async function archiveCategoryAction(categoryId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const category = await adminCatalogService.archiveCategory(categoryId, admin.id);
    revalidatePath('/admin/categories');
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to archive category' };
  }
}

export async function restoreCategoryAction(categoryId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const category = await adminCatalogService.restoreCategory(categoryId, admin.id);
    revalidatePath('/admin/categories');
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore category' };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResponse> {
  try {
    const admin = await requireAdmin();
    const category = await adminCatalogService.deleteCategory(categoryId, admin.id);
    revalidatePath('/admin/categories');
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete category' };
  }
}
