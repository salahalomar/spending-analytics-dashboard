/**
 * The transaction categories the dashboard reports on. Declared as a const
 * tuple so `Category` stays a literal union rather than widening to `string`.
 */
export const CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Transport',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Health',
  'Travel',
  'Subscriptions',
  'Transfers',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = ['Card', 'Apple Pay', 'Google Pay', 'Direct Debit', 'Transfer'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TransactionStatus = 'completed' | 'pending' | 'reverted';

export interface Transaction {
  /** Stable synthetic id, e.g. `txn_00042`. */
  id: string;
  /** ISO-8601 date-time, always UTC. */
  date: string;
  /** Epoch milliseconds — denormalised so range filters avoid re-parsing. */
  timestamp: number;
  merchant: string;
  category: Category;
  /** Minor units (pence) to keep money arithmetic in integers. */
  amountMinor: number;
  currency: 'GBP';
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  /** Free-text note shown in the expanded row. */
  description: string;
}

export type SortField = 'date' | 'amount' | 'merchant';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}
