import type { RootState } from '@/app/store';
import {
  initialState as filtersInitialState,
  type FiltersState,
} from '@/features/filters/filtersSlice';
import { initialState as uiInitialState } from '@/features/ui/uiSlice';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { makeTransaction, makeTransactionSet } from '@/test/fixtures';
import type { Transaction } from '@/types/transaction';
import {
  parseAmountToMinor,
  selectDistinctMerchants,
  selectFilteredTransactions,
  selectHasActiveFilters,
  selectMatchingMerchants,
  selectSpendByCategory,
  selectSpendByMonth,
  selectSummary,
  selectVisibleTransactions,
} from './selectors';

function buildState(items: Transaction[], filters: Partial<FiltersState> = {}): RootState {
  return {
    transactions: { ...transactionsInitialState, items, status: 'succeeded' },
    filters: { ...filtersInitialState, ...filters },
    ui: uiInitialState,
  };
}

const dataset = makeTransactionSet();

describe('parseAmountToMinor', () => {
  it('converts pounds to pence', () => {
    expect(parseAmountToMinor('10')).toBe(1000);
    expect(parseAmountToMinor('10.99')).toBe(1099);
    expect(parseAmountToMinor('0')).toBe(0);
  });

  it('treats blank and invalid input as unbounded', () => {
    expect(parseAmountToMinor('')).toBeNull();
    expect(parseAmountToMinor('   ')).toBeNull();
    expect(parseAmountToMinor('abc')).toBeNull();
    expect(parseAmountToMinor('-5')).toBeNull();
  });
});

describe('selectDistinctMerchants', () => {
  it('de-duplicates and sorts the merchant names', () => {
    expect(selectDistinctMerchants(buildState(dataset))).toEqual([
      'Amazon',
      'Netflix',
      'Tesco',
      'Uber',
    ]);
  });
});

describe('selectMatchingMerchants', () => {
  it('returns null when there is no query, meaning "match everything"', () => {
    expect(selectMatchingMerchants(buildState(dataset))).toBeNull();
    expect(selectMatchingMerchants(buildState(dataset, { merchantQuery: '   ' }))).toBeNull();
  });

  it('matches case-insensitively on a substring', () => {
    expect(selectMatchingMerchants(buildState(dataset, { merchantQuery: 'TES' }))).toEqual(
      new Set(['Tesco']),
    );
    expect(selectMatchingMerchants(buildState(dataset, { merchantQuery: 'e' }))).toEqual(
      new Set(['Netflix', 'Tesco', 'Uber']),
    );
  });

  it('returns an empty set — not null — when nothing matches', () => {
    const matches = selectMatchingMerchants(buildState(dataset, { merchantQuery: 'zzz' }));
    expect(matches).toEqual(new Set());
    expect(matches).not.toBeNull();
  });
});

describe('selectFilteredTransactions', () => {
  it('returns everything when no filter is applied', () => {
    expect(selectFilteredTransactions(buildState(dataset))).toHaveLength(5);
  });

  it('hands back the source array untouched when nothing narrows it', () => {
    const state = buildState(dataset, { dateFrom: '', dateTo: '' });
    expect(selectFilteredTransactions(state)).toBe(dataset);
  });

  it('filters by merchant', () => {
    const result = selectFilteredTransactions(buildState(dataset, { merchantQuery: 'tesco' }));
    expect(result.map((item) => item.id).sort()).toEqual(['a', 'd']);
  });

  it('filters by category, treating an empty selection as "all"', () => {
    expect(selectFilteredTransactions(buildState(dataset, { categories: [] }))).toHaveLength(5);
    expect(
      selectFilteredTransactions(buildState(dataset, { categories: ['Groceries'] })),
    ).toHaveLength(2);
    expect(
      selectFilteredTransactions(buildState(dataset, { categories: ['Groceries', 'Transport'] })),
    ).toHaveLength(3);
  });

  it('filters by status', () => {
    expect(selectFilteredTransactions(buildState(dataset, { statuses: ['pending'] }))).toHaveLength(
      1,
    );
  });

  it('filters by an inclusive amount range', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { minAmount: '25', maxAmount: '75' }))
        .map((item) => item.id)
        .sort(),
    ).toEqual(['a', 'b', 'd']);
  });

  it('filters by an inclusive date range', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { dateFrom: '2025-05-20', dateTo: '2025-06-05' }),
    );
    expect(result.map((item) => item.id).sort()).toEqual(['b', 'c']);
  });

  it('includes transactions falling on the boundary days', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { dateFrom: '2025-06-10', dateTo: '2025-06-10' }),
    );
    expect(result.map((item) => item.id)).toEqual(['a']);
  });

  it('combines filters conjunctively', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { merchantQuery: 'tesco', minAmount: '60' }),
    );
    expect(result.map((item) => item.id)).toEqual(['d']);
  });

  it('returns nothing when the filters exclude everything', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { merchantQuery: 'no-such-merchant' })),
    ).toEqual([]);
  });
});

describe('selectVisibleTransactions', () => {
  it('returns the same reference for the default sort, avoiding a needless copy', () => {
    const state = buildState(dataset, { dateFrom: '', dateTo: '' });
    expect(selectVisibleTransactions(state)).toBe(selectFilteredTransactions(state));
  });

  it('sorts by amount in both directions', () => {
    const descending = selectVisibleTransactions(
      buildState(dataset, { sortField: 'amount', sortDirection: 'desc' }),
    );
    expect(descending.map((item) => item.amountMinor)).toEqual([12000, 7500, 5000, 2500, 1099]);

    const ascending = selectVisibleTransactions(
      buildState(dataset, { sortField: 'amount', sortDirection: 'asc' }),
    );
    expect(ascending.map((item) => item.amountMinor)).toEqual([1099, 2500, 5000, 7500, 12000]);
  });

  it('sorts by merchant alphabetically', () => {
    const result = selectVisibleTransactions(
      buildState(dataset, { sortField: 'merchant', sortDirection: 'asc' }),
    );
    expect(result.map((item) => item.merchant)).toEqual([
      'Amazon',
      'Netflix',
      'Tesco',
      'Tesco',
      'Uber',
    ]);
  });

  it('sorts oldest first when date is ascending', () => {
    const result = selectVisibleTransactions(
      buildState(dataset, { sortField: 'date', sortDirection: 'asc' }),
    );
    expect(result.map((item) => item.id)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('does not mutate the filtered array while sorting', () => {
    const state = buildState(dataset, { sortField: 'amount', sortDirection: 'asc' });
    selectVisibleTransactions(state);
    expect(dataset.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('selectSummary', () => {
  it('totals, counts and averages the current selection', () => {
    const summary = selectSummary(buildState(dataset));
    expect(summary.totalMinor).toBe(28_099);
    expect(summary.count).toBe(5);
    expect(summary.averageMinor).toBe(5620);
    expect(summary.largestMinor).toBe(12_000);
  });

  it('identifies the highest-spending category', () => {
    const summary = selectSummary(buildState(dataset));
    expect(summary.topCategory).toBe('Groceries');
    expect(summary.topCategoryMinor).toBe(12_500);
  });

  it('returns zeroes rather than NaN for an empty selection', () => {
    const summary = selectSummary(buildState(dataset, { merchantQuery: 'nothing' }));
    expect(summary).toMatchObject({
      totalMinor: 0,
      count: 0,
      averageMinor: 0,
      largestMinor: 0,
      topCategory: null,
    });
  });

  it('compares against the preceding window of equal length', () => {
    // June holds a=5000 and b=2500, so 7500. The 30 days before it hold
    // d=7500 and c=1099, so 8599 — a fall of 1099, or 12.78%.
    const summary = selectSummary(
      buildState(dataset, { dateFrom: '2025-06-01', dateTo: '2025-06-30' }),
    );
    expect(summary.totalMinor).toBe(7500);
    expect(summary.changeRatio).toBeCloseTo(-1099 / 8599, 5);
  });

  it('leaves the comparison undefined when the prior window is empty', () => {
    const summary = selectSummary(
      buildState(dataset, { dateFrom: '2025-04-01', dateTo: '2025-04-30' }),
    );
    expect(summary.changeRatio).toBeNull();
  });
});

describe('selectSpendByCategory', () => {
  it('aggregates by category, largest first', () => {
    const result = selectSpendByCategory(buildState(dataset));
    expect(result.map((datum) => datum.category)).toEqual([
      'Groceries',
      'Shopping',
      'Transport',
      'Subscriptions',
    ]);
    expect(result[0]).toMatchObject({ category: 'Groceries', totalMinor: 12_500, count: 2 });
  });

  it('reports each category as a share of the selection, summing to one', () => {
    const result = selectSpendByCategory(buildState(dataset));
    const total = result.reduce((sum, datum) => sum + datum.share, 0);
    expect(total).toBeCloseTo(1);
  });

  it('omits categories with no spend', () => {
    const result = selectSpendByCategory(buildState(dataset, { categories: ['Groceries'] }));
    expect(result).toHaveLength(1);
  });

  it('returns an empty list for an empty selection', () => {
    expect(selectSpendByCategory(buildState([]))).toEqual([]);
  });
});

describe('selectSpendByMonth', () => {
  it('buckets by calendar month, oldest first', () => {
    expect(selectSpendByMonth(buildState(dataset))).toEqual([
      { month: '2025-04', totalMinor: 12_000, count: 1 },
      { month: '2025-05', totalMinor: 8599, count: 2 },
      { month: '2025-06', totalMinor: 7500, count: 2 },
    ]);
  });

  it('handles a month boundary at midnight UTC', () => {
    const items = [
      makeTransaction({ date: '2025-06-30T23:59:59.000Z', amountMinor: 100 }),
      makeTransaction({ date: '2025-07-01T00:00:00.000Z', amountMinor: 200 }),
    ];
    expect(selectSpendByMonth(buildState(items, { dateFrom: '', dateTo: '' }))).toEqual([
      { month: '2025-06', totalMinor: 100, count: 1 },
      { month: '2025-07', totalMinor: 200, count: 1 },
    ]);
  });
});

describe('selectHasActiveFilters', () => {
  it('is false for the untouched filter state', () => {
    expect(selectHasActiveFilters(buildState(dataset))).toBe(false);
  });

  it('ignores whitespace-only searches', () => {
    expect(selectHasActiveFilters(buildState(dataset, { merchantQuery: '   ' }))).toBe(false);
  });

  it.each([
    ['a merchant query', { merchantQuery: 'tesco' }],
    ['a category', { categories: ['Travel' as const] }],
    ['a status', { statuses: ['pending' as const] }],
    ['a minimum amount', { minAmount: '10' }],
    ['a maximum amount', { maxAmount: '100' }],
  ])('is true with %s', (_label, filters) => {
    expect(selectHasActiveFilters(buildState(dataset, filters))).toBe(true);
  });
});

describe('memoisation', () => {
  it('recomputes only when the inputs actually change', () => {
    const state = buildState(dataset, { categories: ['Groceries'] });
    const first = selectFilteredTransactions(state);
    expect(selectFilteredTransactions(state)).toBe(first);

    const changed = buildState(dataset, { categories: ['Transport'] });
    expect(selectFilteredTransactions(changed)).not.toBe(first);
  });
});
