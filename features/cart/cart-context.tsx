'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartContextValue, CartItem } from './types';
import { getStoredCart, setStoredCart } from './cart-storage';
import type { LocalizedProduct } from '@/features/catalog';

import { mockProducts } from '@/features/catalog/data/mock-products';
import { getLocalizedProduct } from '@/features/catalog/services/product-localization';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: LocalizedProduct[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Index catalog products by both ID and Slug
  const productsById = useMemo(() => {
    const map = new Map<string, LocalizedProduct>();

    // 1. First add mock products as baseline fallback (in case DB catalog has variations)
    for (const mock of mockProducts) {
      const localizedMock = getLocalizedProduct(mock);
      map.set(mock.id, localizedMock);
      if (mock.slug) map.set(mock.slug, localizedMock);
    }

    // 2. Override with active DB/runtime catalog products
    for (const product of products) {
      map.set(product.id, product);
      if (product.slug) map.set(product.slug, product);
    }

    return map;
  }, [products]);

  useEffect(() => {
    setItems(getStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      setStoredCart(items);
    }
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return {
      cart: items,
      items,
      hydrated,
      itemCount,
      getProduct: (productId: string) => productsById.get(productId),
      addToCart: (productId: string, quantity = 1) => {
        setItems((current) => {
          const existing = current.find((item) => item.productId === productId);
          if (existing) {
            return current.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          }
          return [...current, { productId, quantity }];
        });
      },
      updateQuantity: (productId: string, quantity: number) => {
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.productId !== productId)
            : current.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
              )
        );
      },
      removeFromCart: (productId: string) => {
        setItems((current) => current.filter((item) => item.productId !== productId));
      },
      removeStaleItems: () => {
        setItems((current) => current.filter((item) => productsById.has(item.productId)));
      },
      clearCart: () => {
        setItems([]);
      },
    };
  }, [items, hydrated, productsById]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
