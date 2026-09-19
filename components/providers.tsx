'use client';

import { AuthProvider } from '@/features/auth';
import { CartProvider } from '@/features/cart';
import { OrderProvider } from '@/features/orders';
import type { LocalizedProduct } from '@/features/catalog';

export function AppProviders({
  children,
  products,
}: {
  children: React.ReactNode;
  products: LocalizedProduct[];
}) {
  return (
    <AuthProvider>
      <CartProvider products={products}>
        <OrderProvider>{children}</OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
}
