/**
 * CSV Export Service
 * Server-side export generation for administrative reporting.
 * Spreadsheet formula injection mitigation (escapes leading =, +, -, @ on text fields).
 * UTF-8 encoding with standard RFC 4180 CSV formatting.
 */

import { analyticsService } from './analytics-service';
import type { AnalyticsFilterInput } from '../domain/analytics-filters';

export type ExportType = 'sales' | 'products' | 'orders' | 'refunds' | 'inventory' | 'promotions';

export class CsvExportService {
  /**
   * Safely formats and escapes a CSV cell to mitigate formula injection attacks.
   */
  public escapeCell(value: any, isText = false): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // Formula injection mitigation for text fields
    if (isText && /^[\=\+\-\@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes and enclose in quotes if comma, quote, or newline is present
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Builds CSV lines from rows of cells.
   */
  private buildCsv(headers: string[], rows: Array<Array<{ val: any; isText?: boolean }>>): string {
    const headerLine = headers.map((h) => this.escapeCell(h, true)).join(',');
    const dataLines = rows.map((row) =>
      row.map((col) => this.escapeCell(col.val, col.isText ?? false)).join(',')
    );
    return [headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Generates CSV for the requested report type.
   */
  async generateExport(type: ExportType, filters: AnalyticsFilterInput = {}): Promise<{ filename: string; content: string }> {
    const data = await analyticsService.getDashboardData(filters);
    const dateTag = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'sales': {
        const headers = ['Date (JST)', 'Gross Sales (JPY)', 'Net Revenue (JPY)', 'Order Count'];
        const rows = data.salesSeries.map((s) => [
          { val: s.date, isText: true },
          { val: s.grossSales },
          { val: s.netRevenue },
          { val: s.orderCount },
        ]);
        return {
          filename: `rupa-sales-${data.period.toLowerCase()}-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      case 'products': {
        const headers = [
          'SKU',
          'Product Name',
          'Category',
          'Units Sold',
          'Gross Sales (JPY)',
          'Discount (JPY)',
          'Net Sales (JPY)',
          'Refunded Units',
          'Refund Amount (JPY)',
          'Current Stock',
          'Refund Rate (%)',
        ];
        const rows = data.topProducts.map((p) => [
          { val: p.sku, isText: true },
          { val: p.productName, isText: true },
          { val: p.categoryName, isText: true },
          { val: p.unitsSold },
          { val: p.grossSales },
          { val: p.discountAllocation },
          { val: p.netSales },
          { val: p.refundedUnits },
          { val: p.refundAmount },
          { val: p.currentStock },
          { val: `${p.refundRate}%` },
        ]);
        return {
          filename: `rupa-products-${data.period.toLowerCase()}-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      case 'orders': {
        const headers = ['Status Stage', 'Order Count'];
        const rows = [
          [{ val: 'Payment Pending', isText: true }, { val: data.orderMetrics.pendingPayment }],
          [{ val: 'Paid', isText: true }, { val: data.orderMetrics.paid }],
          [{ val: 'Processing', isText: true }, { val: data.orderMetrics.processing }],
          [{ val: 'Packed', isText: true }, { val: data.orderMetrics.packed }],
          [{ val: 'Shipped', isText: true }, { val: data.orderMetrics.shipped }],
          [{ val: 'Delivered', isText: true }, { val: data.orderMetrics.delivered }],
          [{ val: 'Completed', isText: true }, { val: data.orderMetrics.completed }],
          [{ val: 'Cancelled', isText: true }, { val: data.orderMetrics.cancelled }],
          [{ val: 'Total Created', isText: true }, { val: data.orderMetrics.total }],
        ];
        return {
          filename: `rupa-orders-${data.period.toLowerCase()}-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      case 'refunds': {
        const headers = ['Metric', 'Value'];
        const rows = [
          [{ val: 'Return Requests', isText: true }, { val: data.returnMetrics.requests }],
          [{ val: 'Approved Returns', isText: true }, { val: data.returnMetrics.approved }],
          [{ val: 'Rejected Returns', isText: true }, { val: data.returnMetrics.rejected }],
          [{ val: 'Completed Returns', isText: true }, { val: data.returnMetrics.completed }],
          [{ val: 'Units Returned', isText: true }, { val: data.returnMetrics.returnedUnits }],
          [{ val: 'Return Rate', isText: true }, { val: `${data.returnMetrics.returnRate}%` }],
          [{ val: 'Successful Refunds', isText: true }, { val: data.refundMetrics.succeededRefunds }],
          [{ val: 'Failed Refunds', isText: true }, { val: data.refundMetrics.failedRefunds }],
          [{ val: 'Total Refunded (JPY)', isText: true }, { val: data.refundMetrics.refundAmount }],
          [{ val: 'Refund Rate', isText: true }, { val: `${data.refundMetrics.refundRate}%` }],
        ];
        return {
          filename: `rupa-refunds-returns-${data.period.toLowerCase()}-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      case 'inventory': {
        const headers = ['SKU', 'Product Name', 'Available Stock', 'Reserved Holds', 'Status'];
        const rows = data.inventoryMetrics.items.map((i) => [
          { val: i.sku, isText: true },
          { val: i.name, isText: true },
          { val: i.availableQty },
          { val: i.reservedQty },
          { val: i.status, isText: true },
        ]);
        return {
          filename: `rupa-inventory-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      case 'promotions': {
        const headers = [
          'Coupon Code',
          'Promotion Name',
          'Times Used',
          'Orders Count',
          'Total Discount (JPY)',
          'Average Discount (JPY)',
          'Remaining Uses',
          'Active Status',
        ];
        const rows = data.promotionMetrics.map((pr) => [
          { val: pr.code, isText: true },
          { val: pr.name, isText: true },
          { val: pr.timesUsed },
          { val: pr.orderCount },
          { val: pr.totalDiscount },
          { val: pr.averageDiscount },
          { val: pr.remainingUsage != null ? pr.remainingUsage : 'Unlimited' },
          { val: pr.isActive ? 'Active' : 'Inactive', isText: true },
        ]);
        return {
          filename: `rupa-promotions-${data.period.toLowerCase()}-${dateTag}.csv`,
          content: this.buildCsv(headers, rows),
        };
      }

      default:
        throw new Error(`Unsupported export type: ${type}`);
    }
  }
}

export const csvExportService = new CsvExportService();
