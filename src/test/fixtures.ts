import type { Category, Transaction, TransactionStatus } from '@/types/transaction';

let sequence = 0;

interface TransactionOverrides {
  id?: string;
  date?: string;
  merchant?: string;
  category?: Category;
  amountMinor?: number;
  status?: TransactionStatus;
}

/**
 * Builds a single transaction with sensible defaults. Tests override only the
 * fields they actually assert on, which keeps them readable.
 */
export function makeTransaction(overrides: TransactionOverrides = {}): Transaction {
  sequence += 1;
  const date = overrides.date ?? '2025-06-15T12:00:00.000Z';
  const merchant = overrides.merchant ?? 'Tesco';

  return {
    id: overrides.id ?? `txn_test_${sequence}`,
    date,
    timestamp: Date.parse(date),
    merchant,
    category: overrides.category ?? 'Groceries',
    amountMinor: overrides.amountMinor ?? 1000,
    currency: 'GBP',
    paymentMethod: 'Card',
    status: overrides.status ?? 'completed',
    description: `Contactless payment · ${merchant}`,
  };
}

/** A small, hand-checkable dataset used across the selector tests. */
export function makeTransactionSet(): Transaction[] {
  return [
    makeTransaction({ id: 'a', merchant: 'Tesco', category: 'Groceries', amountMinor: 5000, date: '2025-06-10T10:00:00.000Z' }),
    makeTransaction({ id: 'b', merchant: 'Uber', category: 'Transport', amountMinor: 2500, date: '2025-06-05T10:00:00.000Z' }),
    makeTransaction({ id: 'c', merchant: 'Netflix', category: 'Subscriptions', amountMinor: 1099, date: '2025-05-20T10:00:00.000Z' }),
    makeTransaction({ id: 'd', merchant: 'Tesco', category: 'Groceries', amountMinor: 7500, date: '2025-05-02T10:00:00.000Z' }),
    makeTransaction({ id: 'e', merchant: 'Amazon', category: 'Shopping', amountMinor: 12000, date: '2025-04-18T10:00:00.000Z', status: 'pending' }),
  ].sort((left, right) => right.timestamp - left.timestamp);
}
