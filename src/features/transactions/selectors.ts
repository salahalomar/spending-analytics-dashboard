import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { Category, Transaction, TransactionDirection } from '@/types/transaction';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types/transaction';
import { endOfDayMs, startOfDayMs, toMonthKey } from '@/utils/date';

const selectSample = (state: RootState) => state.transactions.sample;
const selectUserEntered = (state: RootState) => state.transactions.userEntered;
export const selectShowSample = (state: RootState) => state.transactions.showSample;

export const selectTransactionsStatus = (state: RootState) => state.transactions.status;
export const selectTransactionsError = (state: RootState) => state.transactions.error;
export const selectGeneratedInMs = (state: RootState) => state.transactions.generatedInMs;
export const selectFilters = (state: RootState) => state.filters;

const selectDirectionFilter = (state: RootState) => state.filters.direction;
const selectCounterpartyQuery = (state: RootState) => state.filters.counterpartyQuery;
const selectSelectedCategories = (state: RootState) => state.filters.categories;
const selectSelectedStatuses = (state: RootState) => state.filters.statuses;
const selectDateFrom = (state: RootState) => state.filters.dateFrom;
const selectDateTo = (state: RootState) => state.filters.dateTo;
const selectMinAmount = (state: RootState) => state.filters.minAmount;
const selectMaxAmount = (state: RootState) => state.filters.maxAmount;
const selectSortField = (state: RootState) => state.filters.sortField;
const selectSortDirection = (state: RootState) => state.filters.sortDirection;

/** Parses a major-unit input string into minor units, or null when unusable. */
export function parseAmountToMinor(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

/**
 * The user's own records combined with the sample data.
 *
 * Both inputs are already sorted newest-first, so this is a linear merge
 * rather than a concatenate-and-sort — which matters when the sample side
 * holds 50,000 rows.
 */
export const selectAllTransactions = createSelector(
  [selectSample, selectUserEntered, selectShowSample],
  (sample, userEntered, showSample): Transaction[] => {
    if (!showSample) return userEntered;
    if (userEntered.length === 0) return sample;

    const merged: Transaction[] = new Array<Transaction>(sample.length + userEntered.length);
    let sampleIndex = 0;
    let userIndex = 0;

    for (let i = 0; i < merged.length; i += 1) {
      const nextSample = sample[sampleIndex];
      const nextUser = userEntered[userIndex];

      if (nextSample === undefined) {
        merged[i] = nextUser!;
        userIndex += 1;
      } else if (nextUser === undefined || nextSample.timestamp >= nextUser.timestamp) {
        merged[i] = nextSample;
        sampleIndex += 1;
      } else {
        merged[i] = nextUser;
        userIndex += 1;
      }
    }

    return merged;
  },
);

/**
 * The distinct counterparties present — a few dozen names, regardless of how
 * many transactions there are.
 */
export const selectDistinctCounterparties = createSelector(
  [selectAllTransactions],
  (transactions) => {
    const seen = new Set<string>();
    for (const transaction of transactions) {
      seen.add(transaction.counterparty);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  },
);

/**
 * Resolves the search box to the set of counterparty names it matches.
 *
 * Matching against a few dozen distinct names once and then testing set
 * membership is dramatically cheaper than lower-casing and substring-scanning
 * 50,000 strings on every keystroke. `null` means "no query", i.e. match all.
 */
export const selectMatchingCounterparties = createSelector(
  [selectDistinctCounterparties, selectCounterpartyQuery],
  (counterparties, query): Set<string> | null => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return null;

    const matches = new Set<string>();
    for (const counterparty of counterparties) {
      if (counterparty.toLowerCase().includes(needle)) {
        matches.add(counterparty);
      }
    }
    return matches;
  },
);

/** Category filter as a Set, so the hot loop does O(1) lookups. */
const selectCategorySet = createSelector([selectSelectedCategories], (categories) =>
  categories.length === 0 ? null : new Set<Category>(categories),
);

const selectStatusSet = createSelector([selectSelectedStatuses], (statuses) =>
  statuses.length === 0 ? null : new Set(statuses),
);

const selectAmountBounds = createSelector([selectMinAmount, selectMaxAmount], (min, max) => ({
  minMinor: parseAmountToMinor(min),
  maxMinor: parseAmountToMinor(max),
}));

const selectDateBounds = createSelector([selectDateFrom, selectDateTo], (from, to) => ({
  fromMs: startOfDayMs(from),
  toMs: endOfDayMs(to),
}));

/**
 * Everything except the date range. The summary needs this to compare the
 * selected window against the period immediately before it, and keeping it as
 * its own memoised step means moving a date does not re-run the counterparty,
 * category and amount predicates.
 */
export const selectFilteredIgnoringDate = createSelector(
  [
    selectAllTransactions,
    selectDirectionFilter,
    selectMatchingCounterparties,
    selectCategorySet,
    selectStatusSet,
    selectAmountBounds,
  ],
  (transactions, direction, counterparties, categories, statuses, { minMinor, maxMinor }) => {
    const noFiltersActive =
      direction === 'all' &&
      counterparties === null &&
      categories === null &&
      statuses === null &&
      minMinor === null &&
      maxMinor === null;
    if (noFiltersActive) return transactions;

    const result: Transaction[] = [];
    for (const transaction of transactions) {
      if (direction !== 'all' && transaction.direction !== direction) continue;
      if (counterparties !== null && !counterparties.has(transaction.counterparty)) continue;
      if (categories !== null && !categories.has(transaction.category)) continue;
      if (statuses !== null && !statuses.has(transaction.status)) continue;
      if (minMinor !== null && transaction.amountMinor < minMinor) continue;
      if (maxMinor !== null && transaction.amountMinor > maxMinor) continue;
      result.push(transaction);
    }
    return result;
  },
);

/** The fully filtered set, still in the source order (date descending). */
export const selectFilteredTransactions = createSelector(
  [selectFilteredIgnoringDate, selectDateBounds],
  (transactions: Transaction[], { fromMs, toMs }): Transaction[] => {
    if (fromMs === null && toMs === null) return transactions;

    const result: Transaction[] = [];
    for (const transaction of transactions) {
      if (fromMs !== null && transaction.timestamp < fromMs) continue;
      if (toMs !== null && transaction.timestamp > toMs) continue;
      result.push(transaction);
    }
    return result;
  },
);

/**
 * The array the list actually renders.
 *
 * Transactions arrive newest-first and every filter preserves that order, so
 * the default sort is a no-op and we can hand back the same reference instead
 * of copying and sorting 50,000 rows.
 */
export const selectVisibleTransactions = createSelector(
  [selectFilteredTransactions, selectSortField, selectSortDirection],
  (transactions: Transaction[], field, direction): Transaction[] => {
    if (field === 'date' && direction === 'desc') return transactions;

    const sign = direction === 'asc' ? 1 : -1;
    const sorted = transactions.slice();

    sorted.sort((a, b) => {
      switch (field) {
        case 'amount':
          return sign * (a.amountMinor - b.amountMinor);
        case 'counterparty': {
          const byName = a.counterparty.localeCompare(b.counterparty);
          return sign * (byName !== 0 ? byName : a.timestamp - b.timestamp);
        }
        case 'date':
        default:
          return sign * (a.timestamp - b.timestamp);
      }
    });

    return sorted;
  },
);

export const selectVisibleCount = createSelector(
  [selectVisibleTransactions],
  (transactions) => transactions.length,
);

export const selectTotalCount = createSelector(
  [selectAllTransactions],
  (transactions) => transactions.length,
);

export interface CashSummary {
  incomeMinor: number;
  expenseMinor: number;
  /** Income minus spending; negative means more went out than came in. */
  netMinor: number;
  count: number;
  averageExpenseMinor: number;
  largestExpenseMinor: number;
  topCategory: Category | null;
  topCategoryMinor: number;
  /** Change in spending vs the preceding window; null when incomparable. */
  spendChangeRatio: number | null;
}

/**
 * Headline figures for the selected window, plus a like-for-like comparison
 * against the window immediately before it.
 */
export const selectSummary = createSelector(
  [selectFilteredTransactions, selectFilteredIgnoringDate, selectDateBounds],
  (visible, ignoringDate, { fromMs, toMs }): CashSummary => {
    let incomeMinor = 0;
    let expenseMinor = 0;
    let expenseCount = 0;
    let largestExpenseMinor = 0;
    const byCategory = new Map<Category, number>();

    for (const transaction of visible) {
      if (transaction.direction === 'income') {
        incomeMinor += transaction.amountMinor;
        continue;
      }

      expenseMinor += transaction.amountMinor;
      expenseCount += 1;
      if (transaction.amountMinor > largestExpenseMinor) {
        largestExpenseMinor = transaction.amountMinor;
      }
      byCategory.set(
        transaction.category,
        (byCategory.get(transaction.category) ?? 0) + transaction.amountMinor,
      );
    }

    let topCategory: Category | null = null;
    let topCategoryMinor = 0;
    for (const [category, amount] of byCategory) {
      if (amount > topCategoryMinor) {
        topCategory = category;
        topCategoryMinor = amount;
      }
    }

    let spendChangeRatio: number | null = null;
    if (fromMs !== null && toMs !== null) {
      const windowMs = toMs - fromMs;
      const previousFrom = fromMs - windowMs - 1;
      const previousTo = fromMs - 1;

      let previousSpend = 0;
      for (const transaction of ignoringDate) {
        if (
          transaction.direction === 'expense' &&
          transaction.timestamp >= previousFrom &&
          transaction.timestamp <= previousTo
        ) {
          previousSpend += transaction.amountMinor;
        }
      }

      if (previousSpend > 0) {
        spendChangeRatio = (expenseMinor - previousSpend) / previousSpend;
      }
    }

    return {
      incomeMinor,
      expenseMinor,
      netMinor: incomeMinor - expenseMinor,
      count: visible.length,
      averageExpenseMinor: expenseCount === 0 ? 0 : Math.round(expenseMinor / expenseCount),
      largestExpenseMinor,
      topCategory,
      topCategoryMinor,
      spendChangeRatio,
    };
  },
);

export interface CategoryDatum {
  category: Category;
  totalMinor: number;
  count: number;
  /** Share of the direction's total in the current selection, as a 0–1 ratio. */
  share: number;
}

function aggregateByCategory(
  transactions: readonly Transaction[],
  direction: TransactionDirection,
  order: readonly Category[],
): CategoryDatum[] {
  const totals = new Map<Category, { totalMinor: number; count: number }>();
  let grandTotal = 0;

  for (const transaction of transactions) {
    if (transaction.direction !== direction) continue;

    const entry = totals.get(transaction.category);
    if (entry) {
      entry.totalMinor += transaction.amountMinor;
      entry.count += 1;
    } else {
      totals.set(transaction.category, { totalMinor: transaction.amountMinor, count: 1 });
    }
    grandTotal += transaction.amountMinor;
  }

  return order
    .filter((category) => totals.has(category))
    .map((category) => {
      const entry = totals.get(category)!;
      return {
        category,
        totalMinor: entry.totalMinor,
        count: entry.count,
        share: grandTotal === 0 ? 0 : entry.totalMinor / grandTotal,
      };
    })
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/** Spending per category, largest first. Categories with no spend are dropped. */
export const selectSpendByCategory = createSelector([selectFilteredTransactions], (transactions) =>
  aggregateByCategory(transactions, 'expense', EXPENSE_CATEGORIES),
);

/** Income per category, largest first. */
export const selectIncomeByCategory = createSelector([selectFilteredTransactions], (transactions) =>
  aggregateByCategory(transactions, 'income', INCOME_CATEGORIES),
);

export interface MonthlyDatum {
  /** `YYYY-MM`. */
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  count: number;
}

/** Money in and out per calendar month, oldest first, for the trend chart. */
export const selectCashFlowByMonth = createSelector(
  [selectFilteredTransactions],
  (transactions): MonthlyDatum[] => {
    const totals = new Map<string, { incomeMinor: number; expenseMinor: number; count: number }>();

    for (const transaction of transactions) {
      const month = toMonthKey(transaction.timestamp);
      let entry = totals.get(month);
      if (!entry) {
        entry = { incomeMinor: 0, expenseMinor: 0, count: 0 };
        totals.set(month, entry);
      }

      if (transaction.direction === 'income') {
        entry.incomeMinor += transaction.amountMinor;
      } else {
        entry.expenseMinor += transaction.amountMinor;
      }
      entry.count += 1;
    }

    return Array.from(totals, ([month, entry]) => ({
      month,
      ...entry,
      netMinor: entry.incomeMinor - entry.expenseMinor,
    })).sort((a, b) => a.month.localeCompare(b.month));
  },
);

/** True when the user has narrowed the dataset in any way. */
export const selectHasActiveFilters = createSelector([selectFilters], (filters) => {
  return (
    filters.direction !== 'all' ||
    filters.counterpartyQuery.trim() !== '' ||
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.minAmount !== '' ||
    filters.maxAmount !== ''
  );
});
