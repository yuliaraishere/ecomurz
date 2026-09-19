import { prisma } from '@/lib/prisma';
import { restoreReturnedItemsInventoryService } from '@/features/inventory/services/restore-inventory-service';
import { refundService } from '@/features/refunds/services/refund-service';
import {
  assertValidReturnTransition,
  canOrderInitiateReturn,
} from '../domain/return-state-machine';
import type {
  ReturnRecord,
  RequestReturnInput,
  ApproveReturnInput,
  ReceiveReturnInput,
  RejectReturnInput,
} from '../types';

export class ReturnService {
  /**
   * Customer initiates a return request for items in a DELIVERED order.
   * Inventory is NOT touched here.
   */
  async requestReturn(input: RequestReturnInput) {
    const { orderPublicId, userId, reason, customerNote, items } = input;

    if (!items || items.length === 0) {
      return { success: false, error: 'At least one item must be selected for return' };
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderPublicId }, { publicId: orderPublicId }],
      },
      include: {
        items: true,
        returns: {
          where: {
            status: { notIn: ['RETURN_REJECTED', 'RETURN_CANCELLED'] },
          },
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (userId && order.userId && order.userId !== userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    if (!canOrderInitiateReturn(order.status)) {
      return {
        success: false,
        error: `Returns can only be initiated for DELIVERED orders. Current status: ${order.status}`,
      };
    }

    // Validate items and quantities
    const orderItemMap = new Map(order.items.map((it) => [it.id, it]));

    // Calculate already requested/returned quantities
    const alreadyReturnedQtyMap = new Map<string, number>();
    for (const ret of order.returns) {
      for (const retItem of ret.items) {
        const curr = alreadyReturnedQtyMap.get(retItem.orderItemId) || 0;
        alreadyReturnedQtyMap.set(retItem.orderItemId, curr + retItem.quantity);
      }
    }

    const validatedItems: Array<{
      orderItemId: string;
      productId: string;
      quantity: number;
      reason?: string;
    }> = [];

    for (const reqItem of items) {
      const orderItem = orderItemMap.get(reqItem.orderItemId);
      if (!orderItem) {
        return {
          success: false,
          error: `Item ${reqItem.orderItemId} does not belong to this order`,
        };
      }

      if (reqItem.quantity <= 0) {
        return { success: false, error: 'Return quantity must be greater than 0' };
      }

      const alreadyReturned = alreadyReturnedQtyMap.get(orderItem.id) || 0;
      const maxAvailableToReturn = orderItem.quantity - alreadyReturned;

      if (reqItem.quantity > maxAvailableToReturn) {
        return {
          success: false,
          error: `Requested quantity (${reqItem.quantity}) exceeds remaining returnable quantity (${maxAvailableToReturn}) for item ${orderItem.productName}`,
        };
      }

      validatedItems.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        quantity: reqItem.quantity,
        reason: reqItem.reason || reason,
      });
    }

    // Create return record and items in transaction
    const returnRecord = await prisma.$transaction(async (tx) => {
      const createdReturn = await tx.return.create({
        data: {
          orderId: order.id,
          status: 'RETURN_REQUESTED',
          reason,
          customerNote: customerNote || null,
          requestedAt: new Date(),
          items: {
            create: validatedItems.map((vi) => ({
              orderItemId: vi.orderItemId,
              productId: vi.productId,
              quantity: vi.quantity,
              reason: vi.reason,
            })),
          },
        },
        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productName: true,
                  productPrice: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      // Audit in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          actorType: 'CUSTOMER',
          actorId: userId || null,
          note: `Customer requested return (${reason}) for ${items.length} item(s)`,
        },
      });

      return createdReturn;
    }, { maxWait: 10_000, timeout: 60_000 });

    return {
      success: true,
      returnRecord: returnRecord as unknown as ReturnRecord,
    };
  }

  /**
   * Admin approves a return request.
   * Inventory is NOT restored yet.
   */
  async approveReturn(input: ApproveReturnInput) {
    const { returnId, adminUserId, adminNote } = input;

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!returnRecord) {
      return { success: false, error: 'Return record not found' };
    }

    assertValidReturnTransition(returnRecord.status, 'RETURN_APPROVED');

    const now = new Date();
    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        status: 'RETURN_APPROVED',
        adminNote: adminNote || returnRecord.adminNote,
        approvedAt: now,
      },
      include: {
        items: true,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: returnRecord.orderId,
        fromStatus: returnRecord.order.status,
        toStatus: returnRecord.order.status,
        actorType: 'ADMIN',
        actorId: adminUserId,
        note: adminNote ? `Return approved: ${adminNote}` : 'Return request approved by admin',
      },
    });

    return {
      success: true,
      returnRecord: updated as unknown as ReturnRecord,
    };
  }

  /**
   * Mark return in transit (customer shipped items back).
   */
  async markReturnInTransit(options: {
    returnId: string;
    actorType: 'CUSTOMER' | 'ADMIN';
    actorId?: string | null;
  }) {
    const { returnId, actorType, actorId } = options;

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!returnRecord) {
      return { success: false, error: 'Return record not found' };
    }

    assertValidReturnTransition(returnRecord.status, 'RETURN_IN_TRANSIT');

    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        status: 'RETURN_IN_TRANSIT',
      },
      include: {
        items: true,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: returnRecord.orderId,
        fromStatus: returnRecord.order.status,
        toStatus: returnRecord.order.status,
        actorType,
        actorId: actorId || null,
        note: 'Return package is in transit back to marketplace',
      },
    });

    return {
      success: true,
      returnRecord: updated as unknown as ReturnRecord,
    };
  }

  /**
   * Admin receives the returned package.
   * Inventory is restored here!
   * Proportional or specified refund is executed.
   */
  async receiveReturn(input: ReceiveReturnInput) {
    const { returnId, adminUserId, adminNote, autoRefund = true, refundAmount } = input;

    return prisma.$transaction(async (tx) => {
      const returnRecord = await tx.return.findUnique({
        where: { id: returnId },
        include: {
          order: {
            include: {
              items: true,
            },
          },
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      });

      if (!returnRecord) {
        return { success: false, error: 'Return record not found' };
      }

      assertValidReturnTransition(returnRecord.status, 'RETURN_RECEIVED');

      const now = new Date();

      // 1. Restore inventory for returned items
      await restoreReturnedItemsInventoryService({
        items: returnRecord.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        tx,
      });

      // 2. Process refund if autoRefund is true
      let refundResultRecord = null;
      if (autoRefund) {
        // Calculate net paid item subtotal for returned items (accounting for promotional discount allocations)
        const calculatedItemRefund = returnRecord.items.reduce((sum, item) => {
          if (!item.orderItem) return sum;
          const orderItem = item.orderItem;
          const undiscountedRefund = orderItem.productPrice * item.quantity;
          const discountShare =
            orderItem.quantity > 0 && (orderItem.discountAllocation || 0) > 0
              ? Math.floor(((orderItem.discountAllocation || 0) * item.quantity) / orderItem.quantity)
              : 0;
          const itemRefund = Math.max(0, undiscountedRefund - discountShare);
          return sum + itemRefund;
        }, 0);

        const targetRefundAmount =
          typeof refundAmount === 'number' && refundAmount > 0
            ? Math.round(refundAmount)
            : Math.round(calculatedItemRefund);

        if (targetRefundAmount > 0) {
          const refundResult = await refundService.processRefund({
            orderId: returnRecord.orderId,
            returnId: returnRecord.id,
            amount: targetRefundAmount,
            reason: `Return received: ${returnRecord.reason}`,
            actorType: 'ADMIN',
            actorId: adminUserId,
            tx,
          });

          if (!refundResult.success) {
            return {
              success: false,
              error: `Return received but refund failed: ${refundResult.error}`,
            };
          }

          refundResultRecord = refundResult.refund;
        }
      }

      // 3. Mark return as RECEIVED then COMPLETED
      const updatedReturn = await tx.return.update({
        where: { id: returnId },
        data: {
          status: 'COMPLETED',
          adminNote: adminNote || returnRecord.adminNote,
          receivedAt: now,
          completedAt: now,
        },
        include: {
          items: true,
          refunds: true,
        },
      });

      // 4. Log in OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: returnRecord.orderId,
          fromStatus: returnRecord.order.status,
          toStatus: returnRecord.order.status,
          actorType: 'ADMIN',
          actorId: adminUserId,
          note: adminNote
            ? `Return received and completed. Restored stock. ${adminNote}`
            : 'Return received and completed. Restored stock.',
        },
      });

      return {
        success: true,
        returnRecord: updatedReturn as unknown as ReturnRecord,
        refund: refundResultRecord,
      };
    }, { maxWait: 10_000, timeout: 60_000 });
  }

  /**
   * Admin rejects a return request.
   */
  async rejectReturn(input: RejectReturnInput) {
    const { returnId, adminUserId, adminNote } = input;

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!returnRecord) {
      return { success: false, error: 'Return record not found' };
    }

    assertValidReturnTransition(returnRecord.status, 'RETURN_REJECTED');

    const now = new Date();
    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        status: 'RETURN_REJECTED',
        adminNote: adminNote || null,
        rejectedAt: now,
      },
      include: {
        items: true,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: returnRecord.orderId,
        fromStatus: returnRecord.order.status,
        toStatus: returnRecord.order.status,
        actorType: 'ADMIN',
        actorId: adminUserId,
        note: adminNote ? `Return rejected: ${adminNote}` : 'Return rejected by admin',
      },
    });

    return {
      success: true,
      returnRecord: updated as unknown as ReturnRecord,
    };
  }

  /**
   * Customer or admin cancels a return request before it is received.
   */
  async cancelReturn(options: {
    returnId: string;
    actorType: 'CUSTOMER' | 'ADMIN';
    actorId?: string | null;
  }) {
    const { returnId, actorType, actorId } = options;

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!returnRecord) {
      return { success: false, error: 'Return record not found' };
    }

    assertValidReturnTransition(returnRecord.status, 'RETURN_CANCELLED');

    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        status: 'RETURN_CANCELLED',
      },
      include: {
        items: true,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: returnRecord.orderId,
        fromStatus: returnRecord.order.status,
        toStatus: returnRecord.order.status,
        actorType,
        actorId: actorId || null,
        note: `Return cancelled by ${actorType.toLowerCase()}`,
      },
    });

    return {
      success: true,
      returnRecord: updated as unknown as ReturnRecord,
    };
  }
}

export const returnService = new ReturnService();
