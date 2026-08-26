import type {
  Category,
  Transaction,
  TransactionDirection,
  TransactionStatus,
} from '@/types/transaction';
import type { Obligation, ObligationDirection, ObligationKind, ObligationState } from '@/types/ledger';

let sequence = 0;

interface TransactionOverrides {
  id?: string;
  date?: string;
  direction?: TransactionDirection;
  counterparty?: string;
  category?: Category;
  amountMinor?: number;
  status?: TransactionStatus;
  userEntered?: boolean;
}

/**
 * Builds a single transaction with sensible defaults. Tests override only the
 * fields they actually assert on, which keeps them readable.
 */
export function makeTransaction(overrides: TransactionOverrides = {}): Transaction {
  sequence += 1;
  const date = overrides.date ?? '2025-06-15T12:00:00.000Z';
  const counterparty = overrides.counterparty ?? 'Tesco';
  const direction = overrides.direction ?? 'expense';

  return {
    id: overrides.id ?? `txn_test_${sequence}`,
    date,
    timestamp: Date.parse(date),
    direction,
    counterparty,
    category: overrides.category ?? (direction === 'income' ? 'Salary' : 'Groceries'),
    amountMinor: overrides.amountMinor ?? 1000,
    currency: 'GBP',
    paymentMethod: 'Card',
    status: overrides.status ?? 'completed',
    description: `Card payment · ${counterparty}`,
    userEntered: overrides.userEntered ?? false,
  };
}

/** A small, hand-checkable dataset used across the selector tests. */
export function makeTransactionSet(): Transaction[] {
  return [
    makeTransaction({ id: 'a', counterparty: 'Tesco', category: 'Groceries', amountMinor: 5000, date: '2025-06-10T10:00:00.000Z' }),
    makeTransaction({ id: 'b', counterparty: 'Uber', category: 'Transport', amountMinor: 2500, date: '2025-06-05T10:00:00.000Z' }),
    makeTransaction({ id: 'c', counterparty: 'Netflix', category: 'Subscriptions', amountMinor: 1099, date: '2025-05-20T10:00:00.000Z' }),
    makeTransaction({ id: 'd', counterparty: 'Tesco', category: 'Groceries', amountMinor: 7500, date: '2025-05-02T10:00:00.000Z' }),
    makeTransaction({ id: 'e', counterparty: 'Amazon', category: 'Shopping', amountMinor: 12_000, date: '2025-04-18T10:00:00.000Z', status: 'pending' }),
    makeTransaction({
      id: 'f',
      direction: 'income',
      counterparty: 'Monthly Salary',
      category: 'Salary',
      amountMinor: 250_000,
      date: '2025-06-01T09:00:00.000Z',
    }),
  ].sort((left, right) => right.timestamp - left.timestamp);
}

interface ObligationOverrides {
  id?: string;
  direction?: ObligationDirection;
  counterparty?: string;
  kind?: ObligationKind;
  amountMinor?: number;
  amountPaidMinor?: number;
  dueOn?: string;
  issuedOn?: string;
  state?: ObligationState;
  userEntered?: boolean;
}

export function makeObligation(overrides: ObligationOverrides = {}): Obligation {
  sequence += 1;

  return {
    id: overrides.id ?? `obl_test_${sequence}`,
    direction: overrides.direction ?? 'receivable',
    counterparty: overrides.counterparty ?? 'Jamie',
    kind: overrides.kind ?? 'person',
    reference: 'Split dinner',
    amountMinor: overrides.amountMinor ?? 5000,
    amountPaidMinor: overrides.amountPaidMinor ?? 0,
    currency: 'GBP',
    issuedOn: overrides.issuedOn ?? '2025-06-01',
    dueOn: overrides.dueOn ?? '2025-07-01',
    state: overrides.state ?? 'outstanding',
    notes: '',
    userEntered: overrides.userEntered ?? false,
  };
}
