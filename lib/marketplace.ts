import type { CartItem } from '@/features/cart/types';
import type { Address, ShippingMethod, Transaction } from '@/features/orders/types';
import type { Product, ProductId } from '@/features/catalog';
import {
  catalogRepository,
  getCatalogProducts,
  getProductById,
  getProductByIdSync,
  getCatalogProductsSync,
} from '@/features/catalog';

export type { Product, ProductId, CartItem, Transaction, Address, ShippingMethod };

export const products: Product[] = getCatalogProductsSync();
export const productById = (id: string): Product | undefined => getProductByIdSync(id);

export { catalogRepository, getCatalogProducts, getProductById, getProductByIdSync };

export const shippingOptions = [
  { id: 'regular', name: 'Regular', eta: '2–3 hari', price: 180 },
  { id: 'express', name: 'Express', eta: 'Besok sampai', price: 360 },
  { id: 'same-day', name: 'Same Day', eta: 'Hari ini', price: 520 },
];

export const formatYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);

export const formatPrice = formatYen;
export const rupiah = formatYen;
