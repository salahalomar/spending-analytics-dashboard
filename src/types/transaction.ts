/**
 * Money moving in or out. Every amount in the app is held in minor units
 * (pence) as a positive integer; `direction` carries the sign, so sums never
 * depend on remembering which way round a figure was stored.
 */
export type TransactionDirection = 'income' | 'expense';

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Rent & Mortgage',
  'Utilities',
  'Transport',
  'Eating Out',
  'Shopping',
  'Entertainment',
  'Health & Fitness',
  'Subscriptions',
  'Insurance',
  'Travel',
  'Debt Repayments',
  'Other Spending',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Bonus',
  'Interest & Dividends',
  'Refunds',
  'Gifts',
  'Other Income',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type Category = ExpenseCategory | IncomeCategory;

/** Every category, spending first — the order the filter chips use. */
export const CATEGORIES: readonly Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoriesFor(direction: TransactionDirection): readonly Category[] {
  return direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function directionOfCategory(category: Category): TransactionDirection {
  return (INCOME_CATEGORIES as readonly string[]).includes(category) ? 'income' : 'expense';
}

export const PAYMENT_METHODS = [
  'Card',
  'Bank Transfer',
  'Direct Debit',
  'Cash',
  'Standing Order',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TransactionStatus = 'completed' | 'pending' | 'reverted';

export interface Transaction {
  id: string;
  /** ISO-8601 date-time, always UTC. */
  date: string;
  /** Epoch milliseconds — denormalised so range filters avoid re-parsing. */
  timestamp: number;
  direction: TransactionDirection;
  /** Who was paid, or who paid you. */
  counterparty: string;
  category: Category;
  /** Always positive; read `direction` for the sign. */
  amountMinor: number;
  currency: 'GBP';
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  description: string;
  /** True for rows the user typed in, false for generated sample data. */
  userEntered: boolean;
}

export type SortField = 'date' | 'amount' | 'counterparty';
export type SortDirection = 'asc' | 'desc';

/** Signed value in minor units: income positive, spending negative. */
export function signedAmountMinor(
  transaction: Pick<Transaction, 'direction' | 'amountMinor'>,
): number {
  return transaction.direction === 'income' ? transaction.amountMinor : -transaction.amountMinor;
}
