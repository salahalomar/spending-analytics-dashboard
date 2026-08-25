import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { Category, Transaction } from '@/types/transaction';
import { CATEGORIES } from '@/types/transaction';
import { endOfDayMs, startOfDayMs, toMonthKey } from '@/utils/date';

export const selectAllTransactions = (state: RootState): Transaction[] => state.transactions.items;
export const selectTransactionsStatus = (state: RootState) => state.transactions.status;
export const selectTransactionsError = (state: RootState) => state.transactions.error;
export const selectGeneratedInMs = (state: RootState) => state.transactions.generatedInMs;
export const selectFilters = (state: RootState) => state.filters;

const selectMerchantQuery = (state: RootState) => state.filters.merchantQuery;
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
 * The distinct merchant names present in the dataset — roughly 70 of them,
 * regardless of how many transactions there are.
 */
export const selectDistinctMerchants = createSelector([selectAllTransactions], (transactions) => {
  const seen = new Set<string>();
  for (const transaction of transactions) {
    seen.add(transaction.merchant);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
});

/**
 * Resolves the search box to the set of merchant names it matches.
 *
 * Matching against ~70 distinct names once and then testing set membership is
 * dramatically cheaper than lower-casing and substring-scanning 50,000 strings
 * on every keystroke. `null` means "no query", i.e. match everything.
 */
export const selectMatchingMerchants = createSelector(
  [selectDistinctMerchants, selectMerchantQuery],
  (merchants, query): Set<string> | null => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return null;

    const matches = new Set<string>();
    for (const merchant of merchants) {
      if (merchant.toLowerCase().includes(needle)) {
        matches.add(merchant);
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
 * Everything except the date range. The summary card needs this to compare the
 * selected window against the period immediately before it, and keeping it as
 * its own memoised step means moving a date slider does not re-run the
 * merchant, category and amount predicates.
 */
export const selectFilteredIgnoringDate = createSelector(
  [
    selectAllTransactions,
    selectMatchingMerchants,
    selectCategorySet,
    selectStatusSet,
    selectAmountBounds,
  ],
  (transactions, merchants, categories, statuses, { minMinor, maxMinor }) => {
    const noFiltersActive =
      merchants === null &&
      categories === null &&
      statuses === null &&
      minMinor === null &&
      maxMinor === null;
    if (noFiltersActive) return transactions;

    const result: Transaction[] = [];
    for (const transaction of transactions) {
      if (merchants !== null && !merchants.has(transaction.merchant)) continue;
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
  (transactions, { fromMs, toMs }) => {
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
 * The generator emits transactions newest-first and every filter preserves
 * that order, so the default sort is a no-op and we can hand back the same
 * reference instead of copying and sorting 50,000 rows.
 */
export const selectVisibleTransactions = createSelector(
  [selectFilteredTransactions, selectSortField, selectSortDirection],
  (transactions, field, direction) => {
    if (field === 'date' && direction === 'desc') return transactions;

    const sign = direction === 'asc' ? 1 : -1;
    const sorted = transactions.slice();

    sorted.sort((a, b) => {
      switch (field) {
        case 'amount':
          return sign * (a.amountMinor - b.amountMinor);
        case 'merchant': {
          const byName = a.merchant.localeCompare(b.merchant);
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

export interface SpendSummary {
  totalMinor: number;
  count: number;
  averageMinor: number;
  largestMinor: number;
  topCategory: Category | null;
  topCategoryMinor: number;
  /** Change vs the preceding window of equal length; null when incomparable. */
  changeRatio: number | null;
}

/**
 * Headline figures for the selected window, plus a like-for-like comparison
 * against the window immediately before it.
 */
export const selectSummary = createSelector(
  [selectFilteredTransactions, selectFilteredIgnoringDate, selectDateBounds],
  (visible, ignoringDate, { fromMs, toMs }): SpendSummary => {
    let totalMinor = 0;
    let largestMinor = 0;
    const byCategory = new Map<Category, number>();

    for (const transaction of visible) {
      totalMinor += transaction.amountMinor;
      if (transaction.amountMinor > largestMinor) largestMinor = transaction.amountMinor;
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

    let changeRatio: number | null = null;
    if (fromMs !== null && toMs !== null) {
      const windowMs = toMs - fromMs;
      const previousFrom = fromMs - windowMs - 1;
      const previousTo = fromMs - 1;

      let previousTotal = 0;
      for (const transaction of ignoringDate) {
        if (transaction.timestamp >= previousFrom && transaction.timestamp <= previousTo) {
          previousTotal += transaction.amountMinor;
        }
      }

      if (previousTotal > 0) {
        changeRatio = (totalMinor - previousTotal) / previousTotal;
      }
    }

    return {
      totalMinor,
      count: visible.length,
      averageMinor: visible.length === 0 ? 0 : Math.round(totalMinor / visible.length),
      largestMinor,
      topCategory,
      topCategoryMinor,
      changeRatio,
    };
  },
);

export interface CategoryDatum {
  category: Category;
  totalMinor: number;
  count: number;
  /** Share of total spend in the current selection, as a 0–1 ratio. */
  share: number;
}

/** Spend per category, largest first. Categories with no spend are dropped. */
export const selectSpendByCategory = createSelector(
  [selectFilteredTransactions],
  (transactions): CategoryDatum[] => {
    const totals = new Map<Category, { totalMinor: number; count: number }>();
    let grandTotal = 0;

    for (const transaction of transactions) {
      const entry = totals.get(transaction.category);
      if (entry) {
        entry.totalMinor += transaction.amountMinor;
        entry.count += 1;
      } else {
        totals.set(transaction.category, { totalMinor: transaction.amountMinor, count: 1 });
      }
      grandTotal += transaction.amountMinor;
    }

    return CATEGORIES.filter((category) => totals.has(category))
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
  },
);

export interface MonthlyDatum {
  /** `YYYY-MM`. */
  month: string;
  totalMinor: number;
  count: number;
}

/** Spend per calendar month, oldest first, for the trend chart. */
export const selectSpendByMonth = createSelector(
  [selectFilteredTransactions],
  (transactions): MonthlyDatum[] => {
    const totals = new Map<string, { totalMinor: number; count: number }>();

    for (const transaction of transactions) {
      const month = toMonthKey(transaction.timestamp);
      const entry = totals.get(month);
      if (entry) {
        entry.totalMinor += transaction.amountMinor;
        entry.count += 1;
      } else {
        totals.set(month, { totalMinor: transaction.amountMinor, count: 1 });
      }
    }

    return Array.from(totals, ([month, entry]) => ({ month, ...entry })).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  },
);

/** True when the user has narrowed the dataset in any way. */
export const selectHasActiveFilters = createSelector([selectFilters], (filters) => {
  return (
    filters.merchantQuery.trim() !== '' ||
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.minAmount !== '' ||
    filters.maxAmount !== ''
  );
});
