import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  type Category,
  type Transaction,
  type TransactionDirection,
  type TransactionStatus,
} from '@/types/transaction';
import { CATEGORY_PROFILES, DESCRIPTION_TEMPLATES } from '@/data/counterparties';
import { gaussian, mulberry32, pick, pickWeighted, type Rng } from '@/data/random';

export const DEFAULT_SEED = 20240517;
export const DEFAULT_TRANSACTION_COUNT = 50_000;
/** Transactions are spread across the two years leading up to this date. */
export const DATASET_END_DATE = new Date('2025-12-31T23:59:59.000Z');
export const DATASET_SPAN_DAYS = 730;

/** Roughly one in nine rows is money coming in. */
const INCOME_SHARE = 0.11;

const MS_PER_DAY = 86_400_000;

const EXPENSE_WEIGHTS: readonly (readonly [Category, number])[] = EXPENSE_CATEGORIES.map(
  (category) => [category, CATEGORY_PROFILES[category].weight] as const,
);

const INCOME_WEIGHTS: readonly (readonly [Category, number])[] = INCOME_CATEGORIES.map(
  (category) => [category, CATEGORY_PROFILES[category].weight] as const,
);

/**
 * Weekend and payday effects. Spend is higher at weekends and in the days
 * right after payday, which makes the time-series chart look like real
 * behaviour rather than noise.
 */
function dayOfMonthMultiplier(dayOfMonth: number): number {
  if (dayOfMonth <= 3) return 1.35;
  if (dayOfMonth >= 28) return 0.78;
  return 1;
}

function weekendMultiplier(dayOfWeek: number): number {
  return dayOfWeek === 0 || dayOfWeek === 6 ? 1.28 : 1;
}

/**
 * Gentle upward drift across the dataset so year-on-year comparisons show a
 * trend rather than a flat line.
 */
function inflationMultiplier(progress: number): number {
  return 0.88 + progress * 0.24;
}

function drawAmountMinor(
  rng: Rng,
  category: Category,
  direction: TransactionDirection,
  date: Date,
  progress: number,
): number {
  const profile = CATEGORY_PROFILES[category];

  // Income arrives on a schedule and does not swing with weekends or payday.
  const multiplier =
    direction === 'income'
      ? inflationMultiplier(progress)
      : dayOfMonthMultiplier(date.getUTCDate()) *
        weekendMultiplier(date.getUTCDay()) *
        inflationMultiplier(progress);

  const raw = gaussian(rng, profile.mean, profile.stdDev) * multiplier;
  return Math.round(Math.min(Math.max(Math.abs(raw), profile.min), profile.max));
}

function drawStatus(rng: Rng): TransactionStatus {
  const roll = rng();
  if (roll < 0.965) return 'completed';
  if (roll < 0.99) return 'pending';
  return 'reverted';
}

export interface GenerateOptions {
  count?: number;
  seed?: number;
  endDate?: Date;
  spanDays?: number;
}

/**
 * Builds the sample dataset. Pure and deterministic for a given seed: the same
 * options always yield an identical array, which is what lets the unit tests
 * assert on concrete aggregates.
 *
 * Results come back sorted newest-first, so the default view needs no sort.
 */
export function generateTransactions(options: GenerateOptions = {}): Transaction[] {
  const {
    count = DEFAULT_TRANSACTION_COUNT,
    seed = DEFAULT_SEED,
    endDate = DATASET_END_DATE,
    spanDays = DATASET_SPAN_DAYS,
  } = options;

  const rng = mulberry32(seed);
  const endMs = endDate.getTime();
  const startMs = endMs - spanDays * MS_PER_DAY;
  const spanMs = endMs - startMs;

  const transactions: Transaction[] = new Array<Transaction>(count);

  for (let i = 0; i < count; i += 1) {
    // Bias timestamps slightly towards the recent end of the range.
    const progress = Math.pow(rng(), 0.85);
    const timestamp = Math.floor(startMs + progress * spanMs);
    const date = new Date(timestamp);

    const direction: TransactionDirection = rng() < INCOME_SHARE ? 'income' : 'expense';
    const category = pickWeighted(rng, direction === 'income' ? INCOME_WEIGHTS : EXPENSE_WEIGHTS);
    const counterparty = pick(rng, CATEGORY_PROFILES[category].counterparties);

    transactions[i] = {
      id: `txn_${i.toString().padStart(6, '0')}`,
      date: date.toISOString(),
      timestamp,
      direction,
      counterparty,
      category,
      amountMinor: drawAmountMinor(rng, category, direction, date, progress),
      currency: 'GBP',
      paymentMethod: pick(rng, PAYMENT_METHODS),
      status: drawStatus(rng),
      description: `${pick(rng, DESCRIPTION_TEMPLATES)} · ${counterparty}`,
      userEntered: false,
    };
  }

  // Sorting once here means the reducer can store the canonical order and the
  // default (date, descending) view costs nothing at render time.
  transactions.sort((a, b) => b.timestamp - a.timestamp);

  return transactions;
}

/** Inclusive bounds of the generated dataset, used to seed the date pickers. */
export function getDatasetDateRange(options: GenerateOptions = {}): { start: string; end: string } {
  const { endDate = DATASET_END_DATE, spanDays = DATASET_SPAN_DAYS } = options;
  const endMs = endDate.getTime();
  const startMs = endMs - spanDays * MS_PER_DAY;
  return {
    start: new Date(startMs).toISOString().slice(0, 10),
    end: new Date(endMs).toISOString().slice(0, 10),
  };
}
