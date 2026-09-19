'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  CreateOrderInput,
  CreateOrderResult,
  CreateOrderServerInput,
  OrderContextValue,
  Transaction,
} from './types';
import { generateTransactionId, getStoredTransactions, setStoredTransactions } from './order-storage';
import { createOrderAction } from './actions/create-order-action';
import { getMyOrdersAction } from './actions/get-my-orders-action';

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const local = getStoredTransactions().map((t) => ({
      ...t,
      source: t.source ?? ('legacy' as const),
    }));
    setTransactions(local);
    setHydrated(true);

    // Concurrently synchronize with PostgreSQL authoritative user-scoped records
    void getMyOrdersAction().then((dbOrders) => {
      if (dbOrders.length > 0) {
        setTransactions((current) => {
          const dbMap = new Map(dbOrders.map((o) => [o.id, { ...o, source: 'database' as const }]));
          // Retain legacy local transactions that are not in the database
          const legacyOnly = current.filter((t) => !dbMap.has(t.id));
          const merged = [...dbMap.values(), ...legacyOnly].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return merged;
        });
      }
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      setStoredTransactions(transactions);
    }
  }, [transactions, hydrated]);

  const value = useMemo<OrderContextValue>(() => ({
    transactions,
    hydrated,
    addTransaction: (transaction: Transaction) => {
      setTransactions((current) => {
        if (current.some((t) => t.id === transaction.id)) {
          return current;
        }
        return [transaction, ...current];
      });
    },
    // Synchronous fallback for legacy/compatibility
    createOrder: (input: CreateOrderInput): Transaction => {
      const id = input.id ?? generateTransactionId();
      const createdAt = input.createdAt ?? new Date().toISOString();
      const status = input.status ?? 'Diproses';

      const newTransaction: Transaction = {
        id,
        createdAt,
        items: input.items,
        address: input.address,
        shipping: input.shipping,
        payment: input.payment,
        subtotal: input.subtotal,
        total: input.total,
        status,
        source: 'legacy',
      };

      setTransactions((current) => [newTransaction, ...current]);
      return newTransaction;
    },
    // Authoritative server-side order creation
    createOrderServer: async (input: CreateOrderServerInput): Promise<CreateOrderResult> => {
      const result = await createOrderAction(input);
      if (result.success) {
        const orderWithSource: Transaction = {
          ...result.order,
          source: 'database',
        };
        setTransactions((current) => [
          orderWithSource,
          ...current.filter((t) => t.id !== orderWithSource.id),
        ]);
      }
      return result;
    },
    getTransactionById: (id: string) => transactions.find((item) => item.id === id),
  }), [transactions, hydrated]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextValue {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used inside OrderProvider');
  }
  return context;
}
