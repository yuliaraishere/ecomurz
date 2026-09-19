export interface ShippingMethod {
  id: string;
  name: string;
  price: number; // Integer JPY
  currency: 'JPY';
  estimatedDelivery: string;
  description: string;
}

export const CANONICAL_SHIPPING_METHODS: Record<string, ShippingMethod> = {
  regular: {
    id: 'regular',
    name: 'Regular Delivery',
    price: 180,
    currency: 'JPY',
    estimatedDelivery: '2–3 business days',
    description: 'Standard reliable courier delivery across Japan',
  },
  express: {
    id: 'express',
    name: 'Express Courier',
    price: 360,
    currency: 'JPY',
    estimatedDelivery: '1–2 business days',
    description: 'Priority overnight fulfillment with real-time tracking',
  },
  sameday: {
    id: 'sameday',
    name: 'Same Day Delivery',
    price: 520,
    currency: 'JPY',
    estimatedDelivery: 'Same day (orders before 12:00)',
    description: 'Immediate metropolitan dispatch within Tokyo & Kanto',
  },
};

export function getCanonicalShippingMethod(id: string): ShippingMethod | undefined {
  const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'regular') return CANONICAL_SHIPPING_METHODS.regular;
  if (normalized === 'express') return CANONICAL_SHIPPING_METHODS.express;
  if (normalized === 'sameday') return CANONICAL_SHIPPING_METHODS.sameday;
  return undefined;
}
