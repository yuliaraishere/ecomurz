/**
 * Server-side Cart Service for REST API Handlers
 * Uses HTTP-only session cookies with authoritative product catalog hydration and inventory checks.
 */

import { cookies } from 'next/headers';
import { getProductById, catalogRepository } from '@/features/catalog';
import { DEFAULT_LOCALE, normalizeLocale } from '@/features/catalog/domain/locale';
import { ApiError } from '@/lib/api/errors';

export const API_CART_COOKIE_NAME = 'rupa_cart_api';

export interface RawCartItem {
  itemId: string;
  productId: string;
  quantity: number;
}

export interface HydratedCartItem {
  itemId: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  quantity: number;
  subtotal: number;
  availableStock: number;
  inStock: boolean;
}

export interface CartResponseData {
  items: HydratedCartItem[];
  itemCount: number;
  subtotal: number;
  currency: 'JPY';
}

let inMemoryCart: RawCartItem[] = [];

export function resetInMemoryCart(): void {
  inMemoryCart = [];
}

export class ServerCartService {
  /**
   * Reads raw items from cookie storage.
   */
  async getRawItems(): Promise<RawCartItem[]> {
    let cookieValue: string | undefined;
    try {
      const cookieStore = await cookies();
      cookieValue = cookieStore.get(API_CART_COOKIE_NAME)?.value;
    } catch {
      // Invoked outside request scope (e.g. testing / direct node script)
      return [...inMemoryCart];
    }

    if (!cookieValue) return [];

    try {
      const parsed = JSON.parse(cookieValue);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.productId === 'string' &&
            typeof item.quantity === 'number' &&
            item.quantity > 0
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Persists raw items into cookie storage.
   */
  async saveRawItems(items: RawCartItem[]): Promise<void> {
    try {
      const cookieStore = await cookies();
      if (items.length === 0) {
        cookieStore.delete(API_CART_COOKIE_NAME);
      } else {
        cookieStore.set(API_CART_COOKIE_NAME, JSON.stringify(items), {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }
    } catch {
      // Invoked outside request scope (e.g. testing / direct node script)
      inMemoryCart = [...items];
    }
  }

  /**
   * Hydrates raw items with authoritative pricing and live inventory.
   */
  async getCart(locale: string = DEFAULT_LOCALE): Promise<CartResponseData> {
    const targetLocale = normalizeLocale(locale);
    const rawItems = await this.getRawItems();

    const hydratedItems: HydratedCartItem[] = [];
    let totalSubtotal = 0;
    let totalCount = 0;

    for (const raw of rawItems) {
      const product = await getProductById(raw.productId, targetLocale);
      if (!product) {
        continue;
      }

      const availableStock = product.stock ?? 0;
      const subtotal = product.price * raw.quantity;

      hydratedItems.push({
        itemId: raw.itemId || `item_${raw.productId}`,
        productId: raw.productId,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        quantity: raw.quantity,
        subtotal,
        availableStock,
        inStock: availableStock >= raw.quantity,
      });

      totalSubtotal += subtotal;
      totalCount += raw.quantity;
    }

    return {
      items: hydratedItems,
      itemCount: totalCount,
      subtotal: totalSubtotal,
      currency: 'JPY',
    };
  }

  /**
   * Adds an item to the cart or increments quantity if already present.
   */
  async addItem(
    productId: string,
    quantity = 1,
    locale: string = DEFAULT_LOCALE
  ): Promise<CartResponseData> {
    if (quantity <= 0) {
      throw new ApiError('VALIDATION_ERROR', 'Quantity must be greater than 0', 400, [
        { field: 'quantity', issue: 'Must be >= 1' },
      ]);
    }

    const targetLocale = normalizeLocale(locale);
    const product = await getProductById(productId, targetLocale);
    if (!product) {
      throw new ApiError('NOT_FOUND', `Product "${productId}" not found`, 404);
    }

    const availableStock = product.stock ?? 0;
    if (availableStock <= 0) {
      throw new ApiError('INSUFFICIENT_STOCK', `Product "${product.name}" is out of stock`, 400);
    }

    const rawItems = await this.getRawItems();
    const existingIndex = rawItems.findIndex((i) => i.productId === productId);

    const currentQty = existingIndex >= 0 ? rawItems[existingIndex].quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > availableStock) {
      throw new ApiError(
        'INSUFFICIENT_STOCK',
        `Requested quantity (${newQty}) exceeds available stock (${availableStock})`,
        400
      );
    }

    if (existingIndex >= 0) {
      rawItems[existingIndex].quantity = newQty;
    } else {
      rawItems.push({
        itemId: `item_${productId}`,
        productId,
        quantity,
      });
    }

    await this.saveRawItems(rawItems);
    return this.getCart(targetLocale);
  }

  /**
   * Updates an item quantity by itemId or productId. If quantity is 0, removes the item.
   */
  async updateItem(
    itemId: string,
    quantity: number,
    locale: string = DEFAULT_LOCALE
  ): Promise<CartResponseData> {
    if (quantity < 0) {
      throw new ApiError('VALIDATION_ERROR', 'Quantity cannot be negative', 400, [
        { field: 'quantity', issue: 'Must be >= 0' },
      ]);
    }

    const rawItems = await this.getRawItems();
    const index = rawItems.findIndex(
      (i) => i.itemId === itemId || i.productId === itemId
    );

    if (index === -1) {
      throw new ApiError('NOT_FOUND', `Cart item "${itemId}" not found`, 404);
    }

    if (quantity === 0) {
      rawItems.splice(index, 1);
      await this.saveRawItems(rawItems);
      return this.getCart(locale);
    }

    const product = await getProductById(rawItems[index].productId, locale);
    const availableStock = product?.stock ?? 0;

    if (quantity > availableStock) {
      throw new ApiError(
        'INSUFFICIENT_STOCK',
        `Requested quantity (${quantity}) exceeds available stock (${availableStock})`,
        400
      );
    }

    rawItems[index].quantity = quantity;
    await this.saveRawItems(rawItems);
    return this.getCart(locale);
  }

  /**
   * Removes an item from the cart.
   */
  async removeItem(itemId: string, locale: string = DEFAULT_LOCALE): Promise<CartResponseData> {
    const rawItems = await this.getRawItems();
    const index = rawItems.findIndex(
      (i) => i.itemId === itemId || i.productId === itemId
    );

    if (index === -1) {
      throw new ApiError('NOT_FOUND', `Cart item "${itemId}" not found`, 404);
    }

    rawItems.splice(index, 1);
    await this.saveRawItems(rawItems);
    return this.getCart(locale);
  }

  /**
   * Clears the entire cart cookie.
   */
  async clearCart(): Promise<void> {
    await this.saveRawItems([]);
  }
}

export const serverCartService = new ServerCartService();
