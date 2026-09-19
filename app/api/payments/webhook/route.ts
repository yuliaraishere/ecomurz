import { NextResponse } from 'next/server';
import { paymentWebhookService } from '@/features/payments/services/payment-webhook-service';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    const url = new URL(request.url);
    const queryProvider = url.searchParams.get('provider');
    const headerProvider = request.headers.get('x-payment-provider');
    const isStripe = Boolean(request.headers.get('stripe-signature'));
    const detectedProvider = queryProvider || headerProvider || (isStripe ? 'stripe' : 'dummy');

    let parsedPayload: unknown = rawBody;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      // Raw string payload preserved
    }

    const result = await paymentWebhookService(parsedPayload, headersObj, detectedProvider);
    return NextResponse.json(result, { status: result.received ? 200 : 400 });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process payment webhook', details: error?.message },
      { status: 400 }
    );
  }
}
