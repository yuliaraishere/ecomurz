import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ReturnStatus } from '../types';
import type {
  ReturnListItem,
  ReturnListParams,
  ReturnListResult,
  ReturnRepository,
} from './return-repository';

const returnInclude = {
  items: {
    include: {
      orderItem: {
        select: { id: true, productName: true, productPrice: true, quantity: true },
      },
    },
  },
  refunds: {
    select: { id: true, amount: true, currency: true, status: true },
  },
  order: {
    select: { id: true, publicId: true, recipientName: true, userId: true, status: true },
  },
} satisfies Prisma.ReturnInclude;

type PrismaReturnListItem = Prisma.ReturnGetPayload<{ include: typeof returnInclude }>;

function normalizePagination(params?: ReturnListParams) {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params?.pageSize ?? 20)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function statusWhere(status?: ReturnListParams['status']): Prisma.ReturnWhereInput {
  return status && status !== 'ALL' ? { status } : {};
}

function mapReturn(record: PrismaReturnListItem): ReturnListItem {
  return { ...record, status: record.status as ReturnStatus };
}

export class PrismaReturnRepository implements ReturnRepository {
  async getReturnsByUserId(
    userId: string,
    params?: ReturnListParams,
  ): Promise<ReturnListResult> {
    const { page, pageSize, skip } = normalizePagination(params);
    const where: Prisma.ReturnWhereInput = {
      ...statusWhere(params?.status),
      order: { userId },
    };

    const [records, total] = await Promise.all([
      prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.return.count({ where }),
    ]);

    return {
      returns: records.map(mapReturn),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAllReturns(params?: ReturnListParams): Promise<ReturnListResult> {
    const { page, pageSize, skip } = normalizePagination(params);
    const where = statusWhere(params?.status);

    const [records, total] = await Promise.all([
      prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.return.count({ where }),
    ]);

    return {
      returns: records.map(mapReturn),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getReturnById(returnId: string): Promise<ReturnListItem | null> {
    const record = await prisma.return.findUnique({
      where: { id: returnId },
      include: returnInclude,
    });

    return record ? mapReturn(record) : null;
  }
}

export const returnRepository: ReturnRepository = new PrismaReturnRepository();
