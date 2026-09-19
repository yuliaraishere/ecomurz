export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CategoryStatus = 'ACTIVE' | 'ARCHIVED';

export const VALID_PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'], // Restore capability
};

export const VALID_CATEGORY_STATUS_TRANSITIONS: Record<CategoryStatus, CategoryStatus[]> = {
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'], // Restore capability
};

export class InvalidCatalogStateTransitionError extends Error {
  constructor(entity: 'PRODUCT' | 'CATEGORY', from: string, to: string) {
    super(`Invalid ${entity} status transition from ${from} to ${to}`);
    this.name = 'InvalidCatalogStateTransitionError';
  }
}

export function validateProductStatusTransition(current: ProductStatus, target: ProductStatus): void {
  if (current === target) return;
  const allowed = VALID_PRODUCT_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidCatalogStateTransitionError('PRODUCT', current, target);
  }
}

export function validateCategoryStatusTransition(current: CategoryStatus, target: CategoryStatus): void {
  if (current === target) return;
  const allowed = VALID_CATEGORY_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new InvalidCatalogStateTransitionError('CATEGORY', current, target);
  }
}
