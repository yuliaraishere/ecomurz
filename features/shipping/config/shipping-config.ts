export interface ShippingConfig {
  provider: 'mock' | 'dummy' | string;
  apiUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
}

export function getShippingConfig(): ShippingConfig {
  const configuredProvider = (process.env.SHIPPING_PROVIDER || 'mock').trim().toLowerCase();

  return {
    provider: configuredProvider || 'mock',
    apiUrl: process.env.SHIPPING_PROVIDER_API_URL?.trim(),
    apiKey: process.env.SHIPPING_PROVIDER_API_KEY?.trim(),
    webhookSecret: process.env.SHIPPING_PROVIDER_WEBHOOK_SECRET?.trim(),
  };
}
