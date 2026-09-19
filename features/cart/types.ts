import type { LocalizedProduct } from '@/features/catalog';

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartContextValue = {
  cart: CartItem[];
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  getProduct: (productId: string) => LocalizedProduct | undefined;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  removeStaleItems: () => void;
  clearCart: () => void;
};
