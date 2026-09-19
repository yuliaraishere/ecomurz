import type { PaymentProvider } from './payment-provider';
import { dummyPaymentProvider } from './dummy-payment-provider';
import { stripePaymentProvider } from './stripe-payment-provider';

const providers: Record<string, PaymentProvider> = {
  dummy: dummyPaymentProvider,
  stripe: stripePaymentProvider,
};

export function registerPaymentProvider(name: string, provider: PaymentProvider): void {
  providers[name.toLowerCase()] = provider;
}

export function getPaymentProvider(requestedName?: string): PaymentProvider {
  const name = (requestedName || process.env.PAYMENT_PROVIDER || 'dummy').toLowerCase();

  const provider = providers[name];
  if (!provider) {
    console.warn(`Payment provider "${name}" not found. Falling back to dummy provider.`);
    return dummyPaymentProvider;
  }

  return provider;
}
