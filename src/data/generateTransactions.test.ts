import { CATEGORIES, PAYMENT_METHODS } from '@/types/transaction';
import { CATEGORY_PROFILES } from '@/data/merchants';
import {
  DATASET_END_DATE,
  DATASET_SPAN_DAYS,
  generateTransactions,
  getDatasetDateRange,
} from './generateTransactions';

const MS_PER_DAY = 86_400_000;

describe('generateTransactions', () => {
  const transactions = generateTransactions({ count: 2000, seed: 1 });

  it('generates exactly the requested number of transactions', () => {
    expect(transactions).toHaveLength(2000);
    expect(generateTransactions({ count: 0 })).toHaveLength(0);
  });

  it('is deterministic for a given seed', () => {
    expect(generateTransactions({ count: 50, seed: 1 })).toEqual(
      generateTransactions({ count: 50, seed: 1 }),
    );
  });

  it('produces a different dataset for a different seed', () => {
    expect(generateTransactions({ count: 50, seed: 1 })).not.toEqual(
      generateTransactions({ count: 50, seed: 2 }),
    );
  });

  it('returns transactions sorted newest first', () => {
    for (let i = 1; i < transactions.length; i += 1) {
      expect(transactions[i - 1]!.timestamp).toBeGreaterThanOrEqual(transactions[i]!.timestamp);
    }
  });

  it('gives every transaction a unique id', () => {
    expect(new Set(transactions.map((transaction) => transaction.id)).size).toBe(
      transactions.length,
    );
  });

  it('keeps timestamps inside the dataset window', () => {
    const endMs = DATASET_END_DATE.getTime();
    const startMs = endMs - DATASET_SPAN_DAYS * MS_PER_DAY;

    for (const transaction of transactions) {
      expect(transaction.timestamp).toBeGreaterThanOrEqual(startMs);
      expect(transaction.timestamp).toBeLessThanOrEqual(endMs);
    }
  });

  it('keeps `date` and `timestamp` in agreement', () => {
    for (const transaction of transactions.slice(0, 200)) {
      expect(Date.parse(transaction.date)).toBe(transaction.timestamp);
    }
  });

  it('only uses known categories, merchants and payment methods', () => {
    for (const transaction of transactions) {
      expect(CATEGORIES).toContain(transaction.category);
      expect(PAYMENT_METHODS).toContain(transaction.paymentMethod);
      expect(CATEGORY_PROFILES[transaction.category].merchants).toContain(transaction.merchant);
    }
  });

  it('keeps amounts positive, integral and within the category profile', () => {
    for (const transaction of transactions) {
      const profile = CATEGORY_PROFILES[transaction.category];
      expect(Number.isInteger(transaction.amountMinor)).toBe(true);
      expect(transaction.amountMinor).toBeGreaterThanOrEqual(profile.min);
      expect(transaction.amountMinor).toBeLessThanOrEqual(profile.max);
    }
  });

  it('only assigns known statuses, and marks most as completed', () => {
    const completed = transactions.filter((transaction) => transaction.status === 'completed');
    for (const transaction of transactions) {
      expect(['completed', 'pending', 'reverted']).toContain(transaction.status);
    }
    expect(completed.length / transactions.length).toBeGreaterThan(0.9);
  });

  it('covers every category across a large enough sample', () => {
    const seen = new Set(transactions.map((transaction) => transaction.category));
    expect(seen.size).toBe(CATEGORIES.length);
  });

  it('builds 50,000 transactions in a reasonable time', () => {
    const startedAt = Date.now();
    expect(generateTransactions()).toHaveLength(50_000);
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });
});

describe('getDatasetDateRange', () => {
  it('reports the inclusive bounds as date-input values', () => {
    expect(getDatasetDateRange()).toEqual({ start: '2024-01-01', end: '2025-12-31' });
  });

  it('honours a custom span', () => {
    const range = getDatasetDateRange({ spanDays: 30 });
    expect(range.end).toBe('2025-12-31');
    expect(range.start).toBe('2025-12-01');
  });
});
