import { CATEGORIES, PAYMENT_METHODS, directionOfCategory } from '@/types/transaction';
import { CATEGORY_PROFILES } from '@/data/counterparties';
import {
  datasetEndDate,
  STRESS_TRANSACTION_COUNT,
  DATASET_SPAN_DAYS,
  generateTransactions,
  getDatasetDateRange,
} from './generateTransactions';

const MS_PER_DAY = 86_400_000;

/** Pinned so the date assertions do not move with the calendar. */
const FIXED_END = new Date('2025-12-31T23:59:59.000Z');

describe('generateTransactions', () => {
  const transactions = generateTransactions({ count: 2400, seed: 1, endDate: FIXED_END });

  it('generates exactly the requested number of transactions', () => {
    expect(transactions).toHaveLength(2400);
    expect(generateTransactions({ count: 0, endDate: FIXED_END })).toHaveLength(0);
  });

  it('is deterministic for a given seed', () => {
    expect(generateTransactions({ count: 50, seed: 1, endDate: FIXED_END })).toEqual(
      generateTransactions({ count: 50, seed: 1, endDate: FIXED_END }),
    );
  });

  it('produces a different dataset for a different seed', () => {
    expect(generateTransactions({ count: 50, seed: 1, endDate: FIXED_END })).not.toEqual(
      generateTransactions({ count: 50, seed: 2, endDate: FIXED_END }),
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
    const endMs = FIXED_END.getTime();
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

  it('only uses known categories, counterparties and payment methods', () => {
    for (const transaction of transactions) {
      expect(CATEGORIES).toContain(transaction.category);
      expect(PAYMENT_METHODS).toContain(transaction.paymentMethod);
      expect(CATEGORY_PROFILES[transaction.category].counterparties).toContain(
        transaction.counterparty,
      );
    }
  });

  it('keeps the category on the same side of the ledger as the direction', () => {
    for (const transaction of transactions) {
      expect(directionOfCategory(transaction.category)).toBe(transaction.direction);
    }
  });

  it('produces both money in and money out', () => {
    const income = transactions.filter((transaction) => transaction.direction === 'income');
    expect(income.length).toBeGreaterThan(0);
    expect(income.length).toBeLessThan(transactions.length);
  });

  it('marks generated rows as not user-entered', () => {
    expect(transactions.every((transaction) => transaction.userEntered === false)).toBe(true);
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
    const seen = new Set(
      generateTransactions({ count: 20_000, seed: 4, endDate: FIXED_END }).map((t) => t.category),
    );
    expect(seen.size).toBe(CATEGORIES.length);
  });

  it('builds the stress dataset in a reasonable time', () => {
    const startedAt = Date.now();
    expect(generateTransactions({ count: STRESS_TRANSACTION_COUNT, endDate: FIXED_END })).toHaveLength(
      50_000,
    );
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it('includes one salary payment a month rather than scattering them', () => {
    const salary = transactions.filter((transaction) => transaction.category === 'Salary');
    expect(salary).toHaveLength(24);

    const months = new Set(salary.map((transaction) => transaction.date.slice(0, 7)));
    expect(months.size).toBe(24);
  });

  it('pays the rent once a month', () => {
    const rent = transactions.filter((t) => t.category === 'Rent & Mortgage');
    const months = new Set(rent.map((transaction) => transaction.date.slice(0, 7)));
    expect(rent).toHaveLength(months.size);
  });

  it('produces a plausible monthly balance for one person', () => {
    const total = (direction: 'income' | 'expense') =>
      transactions
        .filter((transaction) => transaction.direction === direction)
        .reduce((sum, transaction) => sum + transaction.amountMinor, 0) / 100;

    const monthlyIn = total('income') / 24;
    const monthlyOut = total('expense') / 24;

    expect(monthlyIn).toBeGreaterThan(2000);
    expect(monthlyIn).toBeLessThan(8000);
    // Living within roughly 30% either side of your income.
    expect(monthlyOut / monthlyIn).toBeGreaterThan(0.7);
    expect(monthlyOut / monthlyIn).toBeLessThan(1.3);
  });
});

describe('getDatasetDateRange', () => {
  it('reports the inclusive bounds as date-input values', () => {
    expect(getDatasetDateRange({ endDate: FIXED_END })).toEqual({
      start: '2024-01-01',
      end: '2025-12-31',
    });
  });

  it('honours a custom span', () => {
    const range = getDatasetDateRange({ spanDays: 30, endDate: FIXED_END });
    expect(range.end).toBe('2025-12-31');
    expect(range.start).toBe('2025-12-01');
  });

  it('ends today by default, so newly added records fall inside it', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(getDatasetDateRange().end).toBe(today);
  });
});

describe('datasetEndDate', () => {
  it('is the end of today in UTC', () => {
    const end = datasetEndDate();
    expect(end.toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    expect(end.getUTCHours()).toBe(23);
  });
});
