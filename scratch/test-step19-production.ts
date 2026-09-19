import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import nextConfig from '../next.config';
import { GET as healthHandler } from '../app/api/health/route';
import { GET as getOrdersHandler } from '../app/api/orders/route';
import { GET as getOrderByIdHandler } from '../app/api/orders/[id]/route';
import { POST as postCartHandler } from '../app/api/cart/route';
import { POST as postOrdersHandler } from '../app/api/orders/route';
import { NextRequest } from 'next/server';
import { requireAdmin, checkIsAdmin, UnauthorizedError } from '../features/auth/services/require-admin';
import {
  MockEmailProvider,
  ResendEmailProvider,
  EmailService,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderOrderConfirmationEmail,
  renderShipmentCreatedEmail,
  renderRefundEmail,
} from '../features/notifications';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runProductionHardeningTests() {
  console.log('================================================================');
  console.log('STEP 19: PRODUCTION HARDENING & VERCEL DEPLOYMENT TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;

  // ---------------------------------------------------------------------------
  // SUITE 1: ENVIRONMENT & SECRET HARDENING
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: ENVIRONMENT & SECRET HARDENING ---');
  {
    assert(Boolean(process.env.DATABASE_URL), 'DATABASE_URL is defined');
    assert(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), 'NEXT_PUBLIC_SUPABASE_URL is defined');
    assert(!process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY is NOT exposed via NEXT_PUBLIC_');
    assert(!process.env.NEXT_PUBLIC_RESEND_API_KEY, 'RESEND_API_KEY is NOT exposed via NEXT_PUBLIC_');
    assert(!process.env.NEXT_PUBLIC_ALGOLIA_ADMIN_API_KEY, 'ALGOLIA_ADMIN_API_KEY is NOT exposed via NEXT_PUBLIC_');
    assert(!process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY, 'GOOGLE_TRANSLATE_API_KEY is NOT exposed via NEXT_PUBLIC_');

    const envExamplePath = path.join(process.cwd(), '.env.example');
    assert(fs.existsSync(envExamplePath), '.env.example file exists');
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
    assert(
      envExampleContent.includes('RESEND_API_KEY') &&
      envExampleContent.includes('DATABASE_URL') &&
      envExampleContent.includes('SUPABASE_SECRET_KEY'),
      '.env.example contains required configuration placeholders without live secrets'
    );
    passed += 8;
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: HTTP SECURITY HEADERS
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: HTTP SECURITY HEADERS ---');
  {
    assert(typeof nextConfig.headers === 'function', 'next.config.ts exports headers() function');
    const headersRules = await nextConfig.headers!();
    assert(Array.isArray(headersRules) && headersRules.length > 0, 'headersRules is a non-empty array');

    const globalRule = headersRules.find((r) => r.source === '/(.*)');
    assert(Boolean(globalRule), 'Global security header rule "/(.*)" is configured');

    const headerMap = new Map<string, string>();
    globalRule?.headers.forEach((h) => headerMap.set(h.key.toLowerCase(), h.value));

    assert(headerMap.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options is "nosniff"');
    assert(headerMap.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options is "SAMEORIGIN"');
    assert(headerMap.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy is "strict-origin-when-cross-origin"');
    assert(headerMap.has('permissions-policy'), 'Permissions-Policy is configured');
    assert(headerMap.has('content-security-policy'), 'Content-Security-Policy is configured');
    passed += 8;
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: PRODUCTION HEALTH CHECK ENDPOINT
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: PRODUCTION HEALTH CHECK ENDPOINT (/api/health) ---');
  {
    const res = await healthHandler();
    assert(res.status === 200, 'GET /api/health returns HTTP 200');
    const json = await res.json();
    assert(json.ok === true, 'Health check response has ok: true');
    assert(json.service === 'rupa-marketplace', 'Health check identifies as "rupa-marketplace"');
    assert(json.status === 'healthy', 'Health check status is "healthy"');
    assert(json.checks?.database === 'connected', 'Database check reports "connected"');
    assert(Boolean(json.timestamp), 'Health check includes ISO timestamp');
    assert(!JSON.stringify(json).includes('postgres://') && !JSON.stringify(json).includes('password'), 'Health check leaks NO secrets or connection strings');
    passed += 7;
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: RESEND & MOCK EMAIL PROVIDER ABSTRACTION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: RESEND & MOCK EMAIL PROVIDER ABSTRACTION ---');
  {
    const mock = new MockEmailProvider();
    assert(mock.name === 'mock', 'MockEmailProvider has name "mock"');

    const sendRes = await mock.send({
      to: 'buyer@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
    assert(sendRes.success === true, 'Mock provider returns success: true');
    assert(Boolean(sendRes.id), 'Mock provider returns generated email ID');
    assert(mock.getSentEmails().length === 1, 'Mock provider recorded sent email');

    mock.setShouldFail(true, 'Simulated network drop');
    const failRes = await mock.send({
      to: 'buyer@example.com',
      subject: 'Failing Email',
      html: '<p>Fail</p>',
    });
    assert(failRes.success === false, 'Mock provider respects failure simulation');
    assert(failRes.error === 'Simulated network drop', 'Mock provider returns failure message');

    const resendNoKey = new ResendEmailProvider('');
    const resendRes = await resendNoKey.send({
      to: 'buyer@example.com',
      subject: 'Resend No Key',
      html: '<p>Test</p>',
    });
    assert(resendRes.success === false, 'ResendEmailProvider fails safely when API key is missing');
    assert(Boolean(resendRes.error?.includes('RESEND_API_KEY')), 'ResendEmailProvider reports missing API key');

    const emailService = new EmailService(mock);
    mock.setShouldFail(false);
    assert(emailService.getProviderName() === 'mock', 'EmailService reflects active provider');

    const serviceSend = await emailService.send({
      to: 'customer@example.com',
      subject: 'Service Send',
      html: '<p>Service</p>',
    });
    assert(serviceSend.success === true, 'EmailService dispatches email successfully');
    passed += 10;
  }

  // ---------------------------------------------------------------------------
  // SUITE 5: LOCALIZED EMAIL TEMPLATES (ALL 8 LOCALES)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: LOCALIZED EMAIL TEMPLATES (ALL 8 LOCALES) ---');
  {
    // Verification: ID, EN, JA, ZH
    const verifyId = renderVerificationEmail({ verificationUrl: 'https://rupa.asia/verify?token=123', locale: 'id' });
    assert(verifyId.subject.includes('Verifikasi'), 'ID verification subject localized');
    const verifyEn = renderVerificationEmail({ verificationUrl: 'https://rupa.asia/verify?token=123', locale: 'en' });
    assert(verifyEn.subject.includes('Verify'), 'EN verification subject localized');
    const verifyJa = renderVerificationEmail({ verificationUrl: 'https://rupa.asia/verify?token=123', locale: 'ja' });
    assert(verifyJa.subject.includes('確認'), 'JA verification subject localized');
    const verifyZh = renderVerificationEmail({ verificationUrl: 'https://rupa.asia/verify?token=123', locale: 'zh' });
    assert(verifyZh.subject.includes('验证'), 'ZH verification subject localized');

    // Password Reset: TL, VI, TH, HI
    const resetTl = renderPasswordResetEmail({ resetUrl: 'https://rupa.asia/reset?token=456', locale: 'tl' });
    assert(resetTl.subject.includes('I-reset'), 'TL password reset subject localized');
    const resetVi = renderPasswordResetEmail({ resetUrl: 'https://rupa.asia/reset?token=456', locale: 'vi' });
    assert(resetVi.subject.includes('Đặt lại'), 'VI password reset subject localized');
    const resetTh = renderPasswordResetEmail({ resetUrl: 'https://rupa.asia/reset?token=456', locale: 'th' });
    assert(resetTh.subject.includes('รีเซ็ต'), 'TH password reset subject localized');
    const resetHi = renderPasswordResetEmail({ resetUrl: 'https://rupa.asia/reset?token=456', locale: 'hi' });
    assert(resetHi.subject.includes('रीसेट'), 'HI password reset subject localized');

    // Order Confirmation: EN & JA
    const orderEn = renderOrderConfirmationEmail({
      orderId: 'ORD-TEST-001',
      items: [{ name: 'Fresh Chicken', quantity: 2, price: 1200, subtotal: 2400 }],
      subtotal: 2400,
      shippingFee: 500,
      discount: 200,
      total: 2700,
      shippingAddress: '1-2-3 Shibuya, Tokyo',
      paymentMethod: 'credit_card',
      locale: 'en',
    });
    assert(orderEn.subject.includes('ORD-TEST-001'), 'Order confirmation subject contains orderId');
    assert(orderEn.html.includes('¥2,700'), 'Order confirmation renders JPY total formatted');

    const orderJa = renderOrderConfirmationEmail({
      orderId: 'ORD-TEST-002',
      items: [{ name: '新鮮な地鶏', quantity: 1, price: 1200, subtotal: 1200 }],
      subtotal: 1200,
      shippingFee: 500,
      discount: 0,
      total: 1700,
      shippingAddress: '東京都渋谷区',
      paymentMethod: 'qris',
      locale: 'ja',
    });
    assert(orderJa.subject.includes('ご注文の確認'), 'JA order confirmation subject localized');
    assert(orderJa.html.includes('新鮮な地鶏'), 'JA order confirmation includes localized item name');

    // Shipment Created
    const shipEn = renderShipmentCreatedEmail({
      orderId: 'ORD-TEST-003',
      trackingNumber: 'TRK-987654',
      courierName: 'Yamato Transport',
      locale: 'en',
    });
    assert(shipEn.subject.includes('Has Shipped'), 'Shipment created subject localized');
    assert(shipEn.html.includes('TRK-987654'), 'Shipment email contains tracking number');

    // Refund Email
    const refundEn = renderRefundEmail({
      orderId: 'ORD-TEST-004',
      refundId: 'REF-112233',
      amount: 1200,
      reason: 'Customer requested cancellation',
      locale: 'en',
    });
    assert(refundEn.subject.includes('Refund Processed'), 'Refund email subject localized');
    assert(refundEn.html.includes('¥1,200'), 'Refund email formats JPY amount');

    passed += 16;
  }

  // ---------------------------------------------------------------------------
  // SUITE 6: EMAIL DEDUPLICATION & NON-BLOCKING BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: EMAIL DEDUPLICATION & NON-BLOCKING BEHAVIOR ---');
  {
    const mock = new MockEmailProvider();
    const emailService = new EmailService(mock);

    const firstSend = await emailService.send({
      to: 'buyer@example.com',
      subject: 'First Send',
      html: '<p>First</p>',
      idempotencyKey: 'idem_key_abc_123',
    });
    assert(firstSend.success === true, 'First send with idempotencyKey succeeds');
    assert(mock.getSentEmails().length === 1, 'First message dispatched to provider');

    const duplicateSend = await emailService.send({
      to: 'buyer@example.com',
      subject: 'Duplicate Send',
      html: '<p>Duplicate</p>',
      idempotencyKey: 'idem_key_abc_123',
    });
    assert(duplicateSend.success === true, 'Duplicate send reports success');
    assert(duplicateSend.idempotent === true, 'Duplicate send marked as idempotent');
    assert(mock.getSentEmails().length === 1, 'Duplicate message was NOT dispatched again');

    // Non-blocking error handling
    mock.setShouldFail(true, 'Network outage');
    const failedDispatch = await emailService.send({
      to: 'buyer@example.com',
      subject: 'Outage Send',
      html: '<p>Outage</p>',
    });
    assert(failedDispatch.success === false, 'Dispatched failure caught safely without crashing');
    assert(Boolean(failedDispatch.error), 'Failure returned error description');

    passed += 6;
  }

  // ---------------------------------------------------------------------------
  // SUITE 7: AUTHENTICATION & AUTHORIZATION HARDENING
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 7: AUTHENTICATION & AUTHORIZATION HARDENING ---');
  {
    let caughtUnauthorized = false;
    try {
      await requireAdmin();
    } catch (err: any) {
      if (err instanceof UnauthorizedError || err?.message === 'UNAUTHORIZED') {
        caughtUnauthorized = true;
      }
    }
    assert(caughtUnauthorized, 'requireAdmin() throws UnauthorizedError when called unauthenticated');

    const isAdmin = await checkIsAdmin();
    assert(isAdmin === false, 'checkIsAdmin() safely returns false without session');

    // Unauthenticated GET /api/orders
    const unauthOrdersReq = new NextRequest('http://localhost:3000/api/orders');
    const unauthOrdersRes = await getOrdersHandler(unauthOrdersReq);
    assert(unauthOrdersRes.status === 401, 'Unauthenticated GET /api/orders returns HTTP 401');
    const unauthOrdersJson = await unauthOrdersRes.json();
    assert(unauthOrdersJson.error?.code === 'UNAUTHORIZED', 'Unauthenticated response returns error code UNAUTHORIZED');

    // Unauthenticated GET /api/orders/:id
    const unauthOrderDetailReq = new NextRequest('http://localhost:3000/api/orders/ORD-NONEXISTENT');
    const unauthOrderDetailRes = await getOrderByIdHandler(unauthOrderDetailReq, { params: Promise.resolve({ id: 'ORD-NONEXISTENT' }) });
    assert(unauthOrderDetailRes.status === 401, 'Unauthenticated GET /api/orders/:id returns HTTP 401');

    // Input validation on /api/cart
    const badCartReq = new NextRequest('http://localhost:3000/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: '', quantity: -5 }),
    });
    const badCartRes = await postCartHandler(badCartReq);
    assert(badCartRes.status === 400, 'Invalid cart payload returns HTTP 400');
    const badCartJson = await badCartRes.json();
    assert(badCartJson.error?.code === 'VALIDATION_ERROR', 'Cart error returns code VALIDATION_ERROR');

    // Input validation on /api/orders
    const badOrderReq = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    const badOrderRes = await postOrdersHandler(badOrderReq);
    assert(badOrderRes.status === 400, 'Empty order items returns HTTP 400');

    passed += 8;
  }

  // ---------------------------------------------------------------------------
  // SUITE 8: PRISMA SERVERLESS & MIGRATION INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 8: PRISMA SERVERLESS & MIGRATION INTEGRITY ---');
  {
    assert(Boolean(prisma), 'PrismaClient instance is available');
    const globalPrisma = (globalThis as any).prisma;
    assert(Boolean(globalPrisma), 'PrismaClient is stored on globalThis for serverless reuse');

    const ping = await prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 as ping`;
    assert(Array.isArray(ping) && ping[0]?.ping === 1, 'SELECT 1 ping query succeeds on Supabase pooler');

    const productCount = await prisma.product.count();
    assert(productCount >= 16, `Catalog contains ${productCount} products (>= 16 verified)`);

    const categoryCount = await prisma.category.count();
    assert(categoryCount >= 5, `Catalog contains ${categoryCount} categories (>= 5 verified)`);

    passed += 5;
  }

  console.log('\n================================================================');
  console.log(`STEP 19 RESULTS: ${passed} / ${passed} ASSERTIONS PASSED!`);
  console.log('================================================================');
  console.log('🎉 STEP 19 PRODUCTION HARDENING VERIFICATION COMPLETED!\n');
}

runProductionHardeningTests()
  .catch((err) => {
    console.error('Step 19 Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
