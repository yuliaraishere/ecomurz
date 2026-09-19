import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { LOW_STOCK_THRESHOLD } from '@/features/inventory/config';
import { mapPrismaOrderToTransaction } from './prisma-order-repository';
import type { Transaction, OrderStatusHistoryRecord } from '../types';

export interface AdminOrderListParams {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  paymentStatus?: string;
  dateRange?: 'today' | 'last7days' | 'last30days' | 'all';
  shippingMethodId?: string;
}

export interface AdminOrderListItem extends Transaction {
  latestPaymentDate?: string;
  paymentProvider?: string;
}

export interface AdminOrderListResult {
  orders: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminInventoryReservationInfo {
  id: string;
  productId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminPaymentInfo {
  id: string;
  provider: string;
  providerPaymentId?: string | null;
  status: string;
  amount: number;
  currency: string;
  paidAt?: string | null;
  failedAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminShipmentInfo {
  id: string;
  provider: string;
  carrierName?: string | null;
  providerShipmentId?: string | null;
  serviceCode: string;
  serviceName?: string | null;
  trackingNumber?: string | null;
  status: string;
  shippingCost: number;
  currency: string;
  estimatedDelivery?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  trackingEvents?: Array<{
    id: string;
    status: string;
    description?: string | null;
    location?: string | null;
    occurredAt: string;
  }>;
}

export interface AdminOrderDetail extends Transaction {
  reservations: AdminInventoryReservationInfo[];
  payments: AdminPaymentInfo[];
  shipment?: AdminShipmentInfo | null;
  userAccount?: {
    id: string;
    role: string;
  } | null;
}

export interface OperationalMetrics {
  pendingPayment: number;
  paid: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  completed: number;
  cancelled: number;
  totalOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export class AdminOrderRepository {
  async getOperationalMetrics(): Promise<OperationalMetrics> {
    const [
      pendingPayment,
      paid,
      processing,
      packed,
      shipped,
      delivered,
      completed,
      cancelled,
      totalOrders,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'PACKED' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count(),
      prisma.inventory.count({
        where: {
          availableQty: { lte: LOW_STOCK_THRESHOLD },
        },
      }),
      prisma.inventory.count({
        where: {
          availableQty: 0,
        },
      }),
    ]);

    return {
      pendingPayment,
      paid,
      processing,
      packed,
      shipped,
      delivered,
      completed,
      cancelled,
      totalOrders,
      lowStockCount: lowStockProducts,
      outOfStockCount: outOfStockProducts,
    };
  }

  async listOrders(params: AdminOrderListParams = {}): Promise<AdminOrderListResult> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 15));
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};

    // 1. Search Query
    if (params.query && params.query.trim()) {
      const q = params.query.trim();
      where.OR = [
        { publicId: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { recipientPhone: { contains: q } },
        { trackingNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 2. Status Filter
    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    // 3. Payment Status Filter
    if (params.paymentStatus && params.paymentStatus !== 'ALL') {
      where.payments = {
        some: {
          status: params.paymentStatus,
        },
      };
    }

    // 4. Shipping Method Filter
    if (params.shippingMethodId && params.shippingMethodId !== 'ALL') {
      where.shippingMethodId = params.shippingMethodId;
    }

    // 5. Date Range Filter
    if (params.dateRange && params.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (params.dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (params.dateRange === 'last7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (params.dateRange === 'last30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(0);
      }

      where.createdAt = {
        gte: startDate,
      };
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const mappedOrders: AdminOrderListItem[] = orders.map((order) => {
      const tx = mapPrismaOrderToTransaction(order);
      const latestPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
      return {
        ...tx,
        latestPaymentDate: latestPayment?.createdAt.toISOString(),
        paymentProvider: latestPayment?.provider,
      };
    });

    return {
      orders: mappedOrders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getOrderForAdmin(orderId: string): Promise<AdminOrderDetail | null> {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { publicId: orderId }],
      },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        reservations: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        shipment: {
          include: {
            trackingEvents: {
              orderBy: { occurredAt: 'asc' },
            },
          },
        },
        cancellation: true,
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
        returns: {
          include: { items: true, refunds: true },
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    const baseTx = mapPrismaOrderToTransaction(order);

    return {
      ...baseTx,
      reservations: order.reservations.map((r) => ({
        id: r.id,
        productId: r.productId,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        failedAt: p.failedAt ? p.failedAt.toISOString() : null,
        expiredAt: p.expiredAt ? p.expiredAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            provider: order.shipment.provider,
            carrierName: order.shipment.carrierName,
            providerShipmentId: order.shipment.providerShipmentId,
            serviceCode: order.shipment.serviceCode,
            serviceName: order.shipment.serviceName,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
            shippingCost: order.shipment.shippingCost,
            currency: order.shipment.currency,
            estimatedDelivery: order.shipment.estimatedDelivery?.toISOString() || null,
            shippedAt: order.shipment.shippedAt?.toISOString() || null,
            deliveredAt: order.shipment.deliveredAt?.toISOString() || null,
            createdAt: order.shipment.createdAt.toISOString(),
            updatedAt: order.shipment.updatedAt.toISOString(),
            trackingEvents: (order.shipment as any).trackingEvents?.map((e: any) => ({
              id: e.id,
              status: e.status,
              description: e.description,
              location: e.location,
              occurredAt: e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt),
            })),
          }
        : null,
      userAccount: order.user ? { id: order.user.id, role: order.user.role } : null,
    };
  }
}

export const adminOrderRepository = new AdminOrderRepository();
