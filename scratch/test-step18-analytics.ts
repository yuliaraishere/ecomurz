import { prisma } from '../lib/prisma';
import {
  resolveDateRange,
  formatTokyoDateKey,
  getTokyoParts,
  createTokyoDate,
  CUSTOM_MAX_DAYS,
  REPORTING_TIMEZONE,
  TOKYO_OFFSET_HOURS,
} from '../features/analytics/domain/analytics-period';
import { sanitizeAnalyticsFilters } from '../features/analytics/domain/analytics-filters';
import { csvExportService } from '../features/analytics/services/csv-export-service';
import { prismaAnalyticsRepository } from '../features/analytics/repositories/prisma-analytics-repository';
import { analyticsService } from '../features/analytics/services/analytics-service';
import { getAnalyticsDataAction } from '../features/analytics/actions/analytics-actions';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '../features/auth/services/require-admin';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runStep18Tests() {
  console.log('================================================================');
  console.log('STEP 18: ANALYTICS & REPORTING - COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;

  // -------------------------------------------------------------
  // SUITE 1: ANALYTICS PERIOD DOMAIN & ASIA/TOKYO TIMEZONE
  // -------------------------------------------------------------
  console.log('--- SUITE 1: ANALYTICS PERIOD DOMAIN & ASIA/TOKYO TIMEZONE ---');

  assert(REPORTING_TIMEZONE === 'Asia/Tokyo', 'Reporting timezone is strictly Asia/Tokyo');
  assert(TOKYO_OFFSET_HOURS === 9, 'Tokyo offset is strictly UTC+9');
  passed += 2;

  const now = new Date('2026-09-11T12:00:00Z');
  const parts = getTokyoParts(now);
  // In Tokyo (UTC+9), 12:00 UTC is 21:00 Tokyo
  assert(parts.hours === 21, `Tokyo hour for 12:00 UTC is 21:00 (got ${parts.hours})`);
  assert(parts.year === 2026 && parts.month === 8 && parts.day === 11, 'Tokyo date parts are correctly calculated');
  passed += 2;

  const todayRange = resolveDateRange('TODAY', null, null, now);
  assert(todayRange.period === 'TODAY', 'Today period resolved');
  assert(todayRange.timeZone === 'Asia/Tokyo', 'Timezone metadata is Asia/Tokyo');

  const yesterdayRange = resolveDateRange('YESTERDAY', null, null, now);
  assert(yesterdayRange.period === 'YESTERDAY', 'Yesterday period resolved');
  assert(yesterdayRange.endDate.getTime() < todayRange.startDate.getTime(), 'Yesterday precedes today strictly');

  const customRange = resolveDateRange('CUSTOM', '2026-01-01', '2026-01-10', now);
  assert(customRange.period === 'CUSTOM', 'Custom period resolved');

  const hugeCustomRange = resolveDateRange('CUSTOM', '2020-01-01', '2025-01-01', now);
  const diffDays = Math.ceil((hugeCustomRange.endDate.getTime() - hugeCustomRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
  assert(diffDays <= CUSTOM_MAX_DAYS, `Custom range capped to ${CUSTOM_MAX_DAYS} days (got ${diffDays})`);
  passed += 6;

  // -------------------------------------------------------------
  // SUITE 2: FILTER SANITIZATION & BOUNDS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: FILTER SANITIZATION & BOUNDS ---');

  const f1 = sanitizeAnalyticsFilters({ period: 'today', limit: 200 });
  assert(f1.period === 'TODAY', 'Normalizes lowercase period to uppercase');
  assert(f1.limit === 100, `Bounds limit to max 100 (got ${f1.limit})`);

  const f2 = sanitizeAnalyticsFilters({ period: 'INVALID_XYZ' });
  assert(f2.period === 'LAST_30_DAYS', 'Invalid period falls back safely to LAST_30_DAYS');

  const f3 = sanitizeAnalyticsFilters({ status: 'paid', categoryId: '  cat-123  ' });
  assert(f3.status === 'PAID', 'Sanitizes valid status');
  assert(f3.categoryId === 'cat-123', 'Trims whitespace on identifiers');

  const f4 = sanitizeAnalyticsFilters({ status: 'DROP TABLE orders;' });
  assert(f4.status === undefined, 'Rejects invalid or malicious status input');
  passed += 6;

  // -------------------------------------------------------------
  // SUITE 3: CSV EXPORT FORMATTING & FORMULA INJECTION MITIGATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: CSV EXPORT FORMATTING & FORMULA INJECTION MITIGATION ---');

  // Test formula injection protection
  assert(csvExportService.escapeCell('=1+1', true) === "'=1+1", 'Escapes leading = formula injection');
  assert(csvExportService.escapeCell('+cmd|', true) === "'+cmd|", 'Escapes leading + formula injection');
  assert(csvExportService.escapeCell('-5+2', true) === "'-5+2", 'Escapes leading - formula injection');
  assert(csvExportService.escapeCell('@SUM(A1:A10)', true) === "'@SUM(A1:A10)", 'Escapes leading @ formula injection');
  assert(csvExportService.escapeCell(1500, false) === '1500', 'Preserves numeric financial value without prepending quote');
  assert(csvExportService.escapeCell('Hello, World', true) === '"Hello, World"', 'Quotes cell with comma');
  assert(csvExportService.escapeCell('Quote "Test"', true) === '"Quote ""Test"""', 'Escapes double quotes with ""');
  passed += 7;

  // Test export generation
  const salesExport = await csvExportService.generateExport('sales', { period: 'LAST_30_DAYS' });
  assert(salesExport.filename.startsWith('rupa-sales-'), 'Sales export filename has proper prefix');
  assert(salesExport.content.includes('Date (JST),Gross Sales (JPY),Net Revenue (JPY),Order Count'), 'Sales export contains expected headers');
  passed += 2;

  // -------------------------------------------------------------
  // SUITE 4: SALES METRICS & JPY INTEGER ARITHMETIC
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: SALES METRICS & JPY INTEGER ARITHMETIC ---');

  const testRange = resolveDateRange('THIS_YEAR');
  const filters = sanitizeAnalyticsFilters({ period: 'THIS_YEAR' });

  const salesSummary = await prismaAnalyticsRepository.getSalesSummary(testRange, filters);

  assert(typeof salesSummary.grossMerchandiseSales === 'number', 'Gross merchandise sales is a number');
  assert(Number.isInteger(salesSummary.grossMerchandiseSales), 'Gross merchandise sales is strictly integer JPY');
  assert(Number.isInteger(salesSummary.discountAmount), 'Discount amount is strictly integer JPY');
  assert(Number.isInteger(salesSummary.netRevenue), 'Net revenue is strictly integer JPY');
  assert(Number.isInteger(salesSummary.averageOrderValue), 'AOV is strictly integer JPY');
  assert(salesSummary.netMerchandiseSales === Math.max(0, salesSummary.grossMerchandiseSales - salesSummary.discountAmount), 'Net merchandise sales matches gross - discount');

  // Verify AOV formula
  if (salesSummary.paidOrderCount > 0) {
    const expectedAov = Math.round(salesSummary.netRevenue / salesSummary.paidOrderCount);
    assert(salesSummary.averageOrderValue === expectedAov, `AOV matches integer formula: ${salesSummary.averageOrderValue} === ${expectedAov}`);
  } else {
    assert(salesSummary.averageOrderValue === 0, 'AOV is 0 when no paid orders exist');
  }

  // Verify series points
  const series = await prismaAnalyticsRepository.getSalesSeries(testRange, filters);
  assert(Array.isArray(series), 'Sales series returns an array');
  assert(series.length > 0, 'Sales series contains points for range');
  assert(series.every((s) => Number.isInteger(s.grossSales) && Number.isInteger(s.netRevenue)), 'Every series point maintains integer currency');
  passed += 9;

  // -------------------------------------------------------------
  // SUITE 5: PRODUCT ANALYTICS & IMMUTABLE ORDERITEM SNAPSHOTS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: PRODUCT ANALYTICS & IMMUTABLE ORDERITEM SNAPSHOTS ---');

  const topProducts = await prismaAnalyticsRepository.getProductAnalytics(testRange, { ...filters, limit: 5 });
  assert(Array.isArray(topProducts), 'Top products returns an array');
  assert(topProducts.length <= 5, 'Respects limit parameter');

  if (topProducts.length > 0) {
    const top = topProducts[0];
    assert(typeof top.productName === 'string' && top.productName.length > 0, 'Product has valid name from snapshot');
    assert(Number.isInteger(top.grossSales), 'Product gross sales is integer JPY');
    assert(Number.isInteger(top.netSales), 'Product net sales is integer JPY');
    assert(top.netSales <= top.grossSales, 'Product net sales <= gross sales');
    assert(typeof top.refundRate === 'number' && top.refundRate >= 0 && top.refundRate <= 100, 'Product refund rate is a valid percentage');
  } else {
    console.log('  (No orders in range to inspect individual product)');
  }
  passed += 5;

  // -------------------------------------------------------------
  // SUITE 6: CATEGORY PERFORMANCE & INVENTORY HEALTH
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: CATEGORY PERFORMANCE & INVENTORY HEALTH ---');

  const categories = await prismaAnalyticsRepository.getCategoryAnalytics(testRange, filters);
  assert(Array.isArray(categories), 'Category analytics returns an array');

  const inventory = await prismaAnalyticsRepository.getInventoryMetrics();
  assert(inventory.lowStockThreshold === 5, 'Inventory low stock threshold is strictly 5');
  assert(typeof inventory.availableStock === 'number', 'Available stock is reported');
  assert(typeof inventory.reservedStock === 'number', 'Reserved stock is reported');
  assert(inventory.lowStockProducts >= 0, 'Low stock products count is non-negative');
  assert(inventory.outOfStockProducts >= 0, 'Out of stock products count is non-negative');
  assert(Array.isArray(inventory.items), 'Inventory items list is returned');
  passed += 7;

  // -------------------------------------------------------------
  // SUITE 7: PROMOTIONS, RETURNS, REFUNDS & CANCELLATIONS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: PROMOTIONS, RETURNS, REFUNDS & CANCELLATIONS ---');

  const promotions = await prismaAnalyticsRepository.getPromotionMetrics(testRange, filters);
  assert(Array.isArray(promotions), 'Promotions metrics returns an array');

  const returnMetrics = await prismaAnalyticsRepository.getReturnMetrics(testRange, filters);
  assert(typeof returnMetrics.requests === 'number', 'Return requests count reported');
  assert(typeof returnMetrics.returnRate === 'number' && returnMetrics.returnRate >= 0, 'Return rate is non-negative');

  const refundMetrics = await prismaAnalyticsRepository.getRefundMetrics(testRange, filters);
  assert(typeof refundMetrics.totalRefunds === 'number', 'Total refunds count reported');
  assert(Number.isInteger(refundMetrics.refundAmount), 'Refund amount is integer JPY');
  assert(typeof refundMetrics.refundRate === 'number', 'Refund rate is reported');

  const cancellationMetrics = await prismaAnalyticsRepository.getCancellationMetrics(testRange, filters);
  assert(typeof cancellationMetrics.total === 'number', 'Total cancellations reported');
  assert(Array.isArray(cancellationMetrics.reasons), 'Cancellation reasons array reported');
  passed += 8;

  // -------------------------------------------------------------
  // SUITE 8: FULFILLMENT & COURIER OPERATIONS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 8: FULFILLMENT & COURIER OPERATIONS ---');

  const fulfillment = await prismaAnalyticsRepository.getFulfillmentMetrics(testRange, filters);
  assert(typeof fulfillment.shippedCount === 'number', 'Shipped count is reported');
  assert(typeof fulfillment.deliveredCount === 'number', 'Delivered count is reported');
  assert(typeof fulfillment.failureCount === 'number', 'Failure count is reported');
  assert(Array.isArray(fulfillment.carrierPerformance), 'Carrier performance list is reported');
  passed += 4;

  // -------------------------------------------------------------
  // SUITE 9: PRIVACY-PRESERVING CUSTOMER METRICS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 9: PRIVACY-PRESERVING CUSTOMER METRICS ---');

  const customerMetrics = await prismaAnalyticsRepository.getCustomerMetrics(testRange, filters);
  assert(typeof customerMetrics.totalCustomers === 'number', 'Total registered customers reported');
  assert(typeof customerMetrics.customersWithOrders === 'number', 'Customers with orders reported');
  assert(typeof customerMetrics.newCustomers === 'number', 'New customers reported');
  assert(typeof customerMetrics.repeatCustomers === 'number', 'Repeat customers reported');
  assert(typeof customerMetrics.repeatPurchaseRate === 'number', 'Repeat purchase rate reported');
  assert(Number.isInteger(customerMetrics.averageCustomerOrderValue), 'Avg customer order value is integer JPY');
  passed += 6;

  // -------------------------------------------------------------
  // SUITE 10: COMPLETE DASHBOARD SERVICE & SERVER ACTION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 10: COMPLETE DASHBOARD SERVICE & SERVER ACTION ---');

  const dashboardData = await analyticsService.getDashboardData({ period: 'LAST_7_DAYS' });
  assert(dashboardData.period === 'LAST_7_DAYS', 'Service resolves period correctly');
  assert(dashboardData.salesSummary !== undefined, 'Dashboard data includes salesSummary');
  assert(dashboardData.orderMetrics !== undefined, 'Dashboard data includes orderMetrics');
  assert(dashboardData.inventoryMetrics !== undefined, 'Dashboard data includes inventoryMetrics');

  // Verify Server Action rejects unauthenticated access when requireAdmin fails
  // getAnalyticsDataAction() calls requireAdmin()
  const actionResult = await getAnalyticsDataAction({ period: 'LAST_7_DAYS' });
  // Since running outside browser session, getCurrentUser() will be null => action returns success: false
  assert(actionResult.success === false, 'Server action safely rejects unauthenticated caller');
  assert(actionResult.error !== undefined, 'Server action returns unauthorized error message');
  passed += 6;

  // -------------------------------------------------------------
  // SUITE 11: MULTI-LOCALE LOCALIZATION VALIDATION (ALL 8 LOCALES)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 11: MULTI-LOCALE LOCALIZATION VALIDATION (ALL 8 LOCALES) ---');

  const locales = ['en', 'id', 'ja', 'tl', 'vi', 'th', 'hi', 'zh'];
  const messagesDir = path.join(process.cwd(), 'messages');

  const requiredAnalyticsSections = [
    'title',
    'subtitle',
    'exportCsv',
    'periods',
    'exports',
    'kpi',
    'charts',
    'tables',
    'inventory',
    'promotions',
    'fulfillment',
    'customers',
  ];

  for (const loc of locales) {
    const filePath = path.join(messagesDir, `${loc}.json`);
    assert(fs.existsSync(filePath), `Locale file exists: ${loc}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    assert(content.Admin && content.Admin.analytics, `${loc}: Admin.analytics exists`);
    assert(content.Analytics !== undefined, `${loc}: Analytics namespace exists`);

    for (const sec of requiredAnalyticsSections) {
      assert(content.Analytics[sec] !== undefined, `${loc}: Analytics.${sec} exists`);
    }
    passed += 3;
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} ASSERTIONS PASSED!`);
  console.log('================================================================');
  console.log('🎉 ALL STEP 18 ANALYTICS TESTS PASSED SUCCESSFULLY!\n');
}

runStep18Tests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
