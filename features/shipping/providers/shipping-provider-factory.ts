import type { ShippingProvider } from './shipping-provider';
import { dummyShippingProvider } from './dummy-shipping-provider';
import { mockShippingProvider } from './mock/mock-shipping-provider';

const providers: Record<string, ShippingProvider> = {
  mock: mockShippingProvider,
  dummy: dummyShippingProvider,
};

export function registerShippingProvider(name: string, provider: ShippingProvider): void {
  providers[name.toLowerCase()] = provider;
}

export function getShippingProvider(requestedName?: string): ShippingProvider {
  const name = (requestedName || process.env.SHIPPING_PROVIDER || 'mock').toLowerCase();

  const provider = providers[name];
  if (!provider) {
    console.warn(`Shipping provider "${name}" not found. Falling back to dummy provider.`);
    return dummyShippingProvider;
  }

  return provider;
}
