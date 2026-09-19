import { NextResponse } from 'next/server';
import { shippingService } from '@/features/shipping/services/shipping-service';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    const url = new URL(request.url);
    const queryProvider = url.searchParams.get('provider');
    const headerProvider = request.headers.get('x-shipping-provider');
    const detectedProvider = queryProvider || headerProvider || 'dummy';

    let parsedPayload: unknown = rawBody;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      // Keep raw string payload
    }

    const result = await shippingService.processWebhook({
      rawBody: parsedPayload,
      headers: headersObj,
      providerName: detectedProvider,
    });

    return NextResponse.json(result, { status: result.received ? 200 : 400 });
  } catch (error: any) {
    console.error('[Shipping Webhook Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process shipping webhook', details: error?.message },
      { status: 400 }
    );
  }
}
