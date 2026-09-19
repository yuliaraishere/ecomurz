import { prisma } from '@/lib/prisma';
import type { OrderRepository, CreateOrderRecordInput } from './order-repository';
import type { Transaction, TransactionStatus } from '../types';
import type { Prisma } from '@prisma/client';

type PrismaOrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    items: true;
    payments: true;
    statusHistory?: true;
  };
}>;

export function mapPrismaOrderToTransaction(order: PrismaOrderWithDetails): Transaction {
  const latestPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;

  return {
    id: order.publicId,
    internalId: order.id,
    userId: order.userId,
    createdAt: order.createdAt.toISOString(),
    status: order.status as TransactionStatus,
    paymentStatus: latestPayment?.status,
    providerPaymentId: latestPayment?.providerPaymentId || undefined,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt?.toISOString() || null,
    deliveredAt: order.deliveredAt?.toISOString() || null,
    completedAt: order.completedAt?.toISOString() || null,
    cancelledAt: order.cancelledAt?.toISOString() || null,
    statusHistory: order.statusHistory
      ? order.statusHistory.map((h) => ({
          id: h.id,
          orderId: h.orderId,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          actorType: h.actorType,
          actorId: h.actorId,
          createdAt: h.createdAt.toISOString(),
        }))
      : undefined,
    address: {
      name: order.recipientName,
      phone: order.recipientPhone,
      address: order.recipientAddress,
      city: order.recipientCity,
      postalCode: order.recipientPostalCode,
    },
    shipping: {
      id: order.shippingMethodId,
      name: order.shippingMethodName,
      eta: order.shippingMethodEta,
      price: order.shippingPrice,
    },
    payment: order.paymentMethod,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    promotionId: order.promotionId,
    couponCode: order.couponCode,
    items: order.items.map((item) => ({
      orderItemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
      productPrice: item.productPrice,
      productImage: item.productImage,
      subtotal: item.subtotal,
      discountAllocation: item.discountAllocation,
    })),
    shipment: (order as any).shipment
      ? {
          id: (order as any).shipment.id,
          provider: (order as any).shipment.provider,
          carrierName: (order as any).shipment.carrierName,
          serviceName: (order as any).shipment.serviceName,
          serviceCode: (order as any).shipment.serviceCode,
          trackingNumber: (order as any).shipment.trackingNumber,
          status: (order as any).shipment.status,
          shippingCost: (order as any).shipment.shippingCost,
          currency: (order as any).shipment.currency,
          estimatedDelivery: (order as any).shipment.estimatedDelivery?.toISOString() || null,
          shippedAt: (order as any).shipment.shippedAt?.toISOString() || null,
          deliveredAt: (order as any).shipment.deliveredAt?.toISOString() || null,
          trackingEvents: (order as any).shipment.trackingEvents?.map((e: any) => ({
            id: e.id,
            status: e.status,
            description: e.description,
            location: e.location,
            occurredAt: e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt),
          })),
        }
      : null,
    cancellation: (order as any).cancellation
      ? {
          id: (order as any).cancellation.id,
          orderId: (order as any).cancellation.orderId,
          status: (order as any).cancellation.status,
          reason: (order as any).cancellation.reason,
          customerNote: (order as any).cancellation.customerNote,
          adminNote: (order as any).cancellation.adminNote,
          actorType: (order as any).cancellation.actorType,
          actorId: (order as any).cancellation.actorId,
          requestedAt: (order as any).cancellation.requestedAt.toISOString(),
          approvedAt: (order as any).cancellation.approvedAt?.toISOString() || null,
          rejectedAt: (order as any).cancellation.rejectedAt?.toISOString() || null,
          cancelledAt: (order as any).cancellation.cancelledAt?.toISOString() || null,
        }
      : null,
    refunds: (order as any).refunds
      ? (order as any).refunds.map((r: any) => ({
          id: r.id,
          paymentId: r.paymentId,
          returnId: r.returnId,
          amount: r.amount,
          currency: r.currency,
          reason: r.reason,
          status: r.status,
          providerRefundId: r.providerRefundId,
          processedAt: r.processedAt?.toISOString() || null,
          createdAt: r.createdAt.toISOString(),
        }))
      : undefined,
    returns: (order as any).returns
      ? (order as any).returns.map((ret: any) => ({
          id: ret.id,
          orderId: ret.orderId,
          status: ret.status,
          reason: ret.reason,
          customerNote: ret.customerNote,
          adminNote: ret.adminNote,
          requestedAt: ret.requestedAt.toISOString(),
          approvedAt: ret.approvedAt?.toISOString() || null,
          rejectedAt: ret.rejectedAt?.toISOString() || null,
          receivedAt: ret.receivedAt?.toISOString() || null,
          completedAt: ret.completedAt?.toISOString() || null,
          items: ret.items
            ? ret.items.map((it: any) => ({
                id: it.id,
                orderItemId: it.orderItemId,
                productId: it.productId,
                quantity: it.quantity,
                reason: it.reason,
              }))
            : [],
          refunds: ret.refunds
            ? ret.refunds.map((rf: any) => ({
                id: rf.id,
                amount: rf.amount,
                currency: rf.currency,
                status: rf.status,
              }))
            : [],
        }))
      : undefined,
  };
}

export class PrismaOrderRepository implements OrderRepository {
  async createOrder(data: CreateOrderRecordInput, client?: Prisma.TransactionClient): Promise<Transaction> {
    const runner = async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({
        data: {
          publicId: data.publicId,
          userId: data.userId || null,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          recipientAddress: data.recipientAddress,
          recipientCity: data.recipientCity,
          recipientPostalCode: data.recipientPostalCode,
          shippingMethodId: data.shippingMethodId,
          shippingMethodName: data.shippingMethodName,
          shippingMethodEta: data.shippingMethodEta,
          shippingPrice: data.shippingPrice,
          paymentMethod: data.paymentMethod,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount ?? 0,
          total: data.total,
          promotionId: data.promotionId || null,
          couponCode: data.couponCode || null,
          status: data.status,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              productName: item.productName,
              productPrice: item.productPrice,
              productImage: item.productImage,
              subtotal: item.subtotal,
              discountAllocation: item.discountAllocation ?? 0,
            })),
          },
          payments: {
            create: {
              provider: data.paymentProvider || 'dummy',
              providerPaymentId: data.providerPaymentId || null,
              status: 'PENDING',
              amount: data.total,
              currency: data.currency || 'JPY',
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: data.status || 'PENDING_PAYMENT',
              actorType: 'CUSTOMER',
              actorId: data.userId || null,
              note: 'Order placed',
            },
          },
        },
        include: {
          items: true,
          payments: true,
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
        },
      });

      return mapPrismaOrderToTransaction(order);
    };

    if (client) {
      return runner(client);
    }
    return prisma.$transaction(runner);
  }

  async getOrderByPublicId(publicId: string): Promise<Transaction | undefined> {
    const order = await prisma.order.findUnique({
      where: { publicId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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
      },
    });
    return order ? mapPrismaOrderToTransaction(order) : undefined;
  }

  async getOrdersByUserId(userId: string): Promise<Transaction[]> {
    const orders = await prisma.order.findMany({
      where: { userId },
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
      },
    });
    return orders.map(mapPrismaOrderToTransaction);
  }

  async getRecentOrders(limit: number = 20): Promise<Transaction[]> {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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
      },
    });
    return orders.map(mapPrismaOrderToTransaction);
  }
}

export const prismaOrderRepository = new PrismaOrderRepository();
