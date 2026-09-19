import type { CategoryStatus } from './catalog-state-machine';

export type CategoryId = string;

export type Category = {
  id: CategoryId;
  name: string;
  slug?: string;
  description?: string | null;
  status?: CategoryStatus;
  archivedAt?: Date | null;
  translations?: Record<string, { name: string; description?: string | null }>;
};

export const DEFAULT_CATEGORY = 'Semua';

