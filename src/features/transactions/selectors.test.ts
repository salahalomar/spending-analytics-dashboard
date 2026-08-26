import type { RootState } from '@/app/store';
import {
  initialState as filtersInitialState,
  type FiltersState,
} from '@/features/filters/filtersSlice';
import { initialState as uiInitialState } from '@/features/ui/uiSlice';
import { initialState as ledgerInitialState } from '@/features/ledger/ledgerSlice';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { makeTransaction, makeTransactionSet } from '@/test/fixtures';
import type { Transaction } from '@/types/transaction';
import {
  parseAmountToMinor,
  selectAllTransactions,
  selectCashFlowByMonth,
  selectDistinctCounterparties,
  selectFilteredTransactions,
  selectHasActiveFilters,
  selectIncomeByCategory,
  selectMatchingCounterparties,
  selectSpendByCategory,
  selectSummary,
  selectVisibleTransactions,
} from './selectors';

interface BuildOptions {
  filters?: Partial<FiltersState>;
  userEntered?: Transaction[];
  showSample?: boolean;
}

function buildState(sample: Transaction[], options: BuildOptions = {}): RootState {
  return {
    transactions: {
      ...transactionsInitialState,
      sample,
      userEntered: options.userEntered ?? [],
      showSample: options.showSample ?? true,
      status: 'succeeded',
    },
    ledger: ledgerInitialState,
    filters: { ...filtersInitialState, ...options.filters },
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

describe('selectAllTransactions', () => {
  it('returns the sample untouched when the user has entered nothing', () => {
    const state = buildState(dataset);
    expect(selectAllTransactions(state)).toBe(dataset);
  });

  it('merges the user records into date order', () => {
    const own = [
      makeTransaction({ id: 'own-new', date: '2025-06-08T10:00:00.000Z', userEntered: true }),
      makeTransaction({ id: 'own-old', date: '2025-04-20T10:00:00.000Z', userEntered: true }),
    ];
    const merged = selectAllTransactions(buildState(dataset, { userEntered: own }));

    expect(merged).toHaveLength(dataset.length + own.length);
    for (let i = 1; i < merged.length; i += 1) {
      expect(merged[i - 1]!.timestamp).toBeGreaterThanOrEqual(merged[i]!.timestamp);
    }
    expect(merged.map((row) => row.id)).toContain('own-new');
  });

  it('hides the sample data when the toggle is off', () => {
    const own = [makeTransaction({ id: 'own', userEntered: true })];
    const state = buildState(dataset, { userEntered: own, showSample: false });
    expect(selectAllTransactions(state)).toEqual(own);
  });
});

describe('selectDistinctCounterparties', () => {
  it('de-duplicates and sorts the names', () => {
    expect(selectDistinctCounterparties(buildState(dataset))).toEqual([
      'Amazon',
      'Monthly Salary',
      'Netflix',
      'Tesco',
      'Uber',
    ]);
  });
});

describe('selectMatchingCounterparties', () => {
  it('returns null when there is no query, meaning "match everything"', () => {
    expect(selectMatchingCounterparties(buildState(dataset))).toBeNull();
    expect(
      selectMatchingCounterparties(buildState(dataset, { filters: { counterpartyQuery: '   ' } })),
    ).toBeNull();
  });

  it('matches case-insensitively on a substring', () => {
    expect(
      selectMatchingCounterparties(buildState(dataset, { filters: { counterpartyQuery: 'TES' } })),
    ).toEqual(new Set(['Tesco']));
  });

  it('returns an empty set — not null — when nothing matches', () => {
    const matches = selectMatchingCounterparties(
      buildState(dataset, { filters: { counterpartyQuery: 'zzz' } }),
    );
    expect(matches).toEqual(new Set());
    expect(matches).not.toBeNull();
  });
});

describe('selectFilteredTransactions', () => {
  it('returns everything when no filter is applied', () => {
    expect(selectFilteredTransactions(buildState(dataset))).toHaveLength(6);
  });

  it('hands back the source array untouched when nothing narrows it', () => {
    const state = buildState(dataset, { filters: { dateFrom: '', dateTo: '' } });
    expect(selectFilteredTransactions(state)).toBe(dataset);
  });

  it('filters to money in or money out', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { direction: 'income' } })).map(
        (row) => row.id,
      ),
    ).toEqual(['f']);
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { direction: 'expense' } })),
    ).toHaveLength(5);
  });

  it('filters by counterparty', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { filters: { counterpartyQuery: 'tesco' } }),
    );
    expect(result.map((item) => item.id).sort()).toEqual(['a', 'd']);
  });

  it('filters by category, treating an empty selection as "all"', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { categories: [] } })),
    ).toHaveLength(6);
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { categories: ['Groceries'] } })),
    ).toHaveLength(2);
  });

  it('filters by status', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { statuses: ['pending'] } })),
    ).toHaveLength(1);
  });

  it('filters by an inclusive amount range', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { filters: { minAmount: '25', maxAmount: '75' } }),
    );
    expect(result.map((item) => item.id).sort()).toEqual(['a', 'b', 'd']);
  });

  it('filters by an inclusive date range', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { filters: { dateFrom: '2025-05-20', dateTo: '2025-06-05' } }),
    );
    expect(result.map((item) => item.id).sort()).toEqual(['b', 'c', 'f']);
  });

  it('includes transactions falling on the boundary days', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { filters: { dateFrom: '2025-06-10', dateTo: '2025-06-10' } }),
    );
    expect(result.map((item) => item.id)).toEqual(['a']);
  });

  it('combines filters conjunctively', () => {
    const result = selectFilteredTransactions(
      buildState(dataset, { filters: { counterpartyQuery: 'tesco', minAmount: '60' } }),
    );
    expect(result.map((item) => item.id)).toEqual(['d']);
  });

  it('returns nothing when the filters exclude everything', () => {
    expect(
      selectFilteredTransactions(buildState(dataset, { filters: { counterpartyQuery: 'nope' } })),
    ).toEqual([]);
  });
});

describe('selectVisibleTransactions', () => {
  it('returns the same reference for the default sort, avoiding a needless copy', () => {
    const state = buildState(dataset, { filters: { dateFrom: '', dateTo: '' } });
    expect(selectVisibleTransactions(state)).toBe(selectFilteredTransactions(state));
  });

  it('sorts by amount in both directions', () => {
    const descending = selectVisibleTransactions(
      buildState(dataset, { filters: { sortField: 'amount', sortDirection: 'desc' } }),
    );
    expect(descending[0]!.amountMinor).toBe(250_000);

    const ascending = selectVisibleTransactions(
      buildState(dataset, { filters: { sortField: 'amount', sortDirection: 'asc' } }),
    );
    expect(ascending[0]!.amountMinor).toBe(1099);
  });

  it('sorts by name alphabetically', () => {
    const result = selectVisibleTransactions(
      buildState(dataset, { filters: { sortField: 'counterparty', sortDirection: 'asc' } }),
    );
    expect(result.map((item) => item.counterparty)).toEqual([
      'Amazon',
      'Monthly Salary',
      'Netflix',
      'Tesco',
      'Tesco',
      'Uber',
    ]);
  });

  it('does not mutate the filtered array while sorting', () => {
    const state = buildState(dataset, { filters: { sortField: 'amount', sortDirection: 'asc' } });
    selectVisibleTransactions(state);
    expect(dataset.map((item) => item.id)).toEqual(['a', 'b', 'f', 'c', 'd', 'e']);
  });
});

describe('selectSummary', () => {
  it('splits money in from money out', () => {
    const summary = selectSummary(buildState(dataset));
    expect(summary.incomeMinor).toBe(250_000);
    expect(summary.expenseMinor).toBe(28_099);
    expect(summary.netMinor).toBe(221_901);
    expect(summary.count).toBe(6);
  });

  it('averages over spending only, not over every row', () => {
    const summary = selectSummary(buildState(dataset));
    expect(summary.averageExpenseMinor).toBe(5620);
    expect(summary.largestExpenseMinor).toBe(12_000);
  });

  it('identifies the highest-spending category', () => {
    const summary = selectSummary(buildState(dataset));
    expect(summary.topCategory).toBe('Groceries');
    expect(summary.topCategoryMinor).toBe(12_500);
  });

  it('reports a negative net when more went out than came in', () => {
    const summary = selectSummary(buildState(dataset, { filters: { direction: 'expense' } }));
    expect(summary.netMinor).toBe(-28_099);
  });

  it('returns zeroes rather than NaN for an empty selection', () => {
    const summary = selectSummary(buildState(dataset, { filters: { counterpartyQuery: 'nope' } }));
    expect(summary).toMatchObject({
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      count: 0,
      averageExpenseMinor: 0,
      topCategory: null,
    });
  });

  it('compares spending against the preceding window of equal length', () => {
    // June spending is a + b = 7500. The 30 days before hold d + c = 8599.
    const summary = selectSummary(
      buildState(dataset, { filters: { dateFrom: '2025-06-01', dateTo: '2025-06-30' } }),
    );
    expect(summary.expenseMinor).toBe(7500);
    expect(summary.spendChangeRatio).toBeCloseTo(-1099 / 8599, 5);
  });

  it('leaves the comparison undefined when the prior window is empty', () => {
    const summary = selectSummary(
      buildState(dataset, { filters: { dateFrom: '2025-04-01', dateTo: '2025-04-30' } }),
    );
    expect(summary.spendChangeRatio).toBeNull();
  });
});

describe('selectSpendByCategory', () => {
  it('aggregates spending only, largest first', () => {
    const result = selectSpendByCategory(buildState(dataset));
    expect(result.map((datum) => datum.category)).toEqual([
      'Groceries',
      'Shopping',
      'Transport',
      'Subscriptions',
    ]);
    expect(result[0]).toMatchObject({ category: 'Groceries', totalMinor: 12_500, count: 2 });
  });

  it('reports shares of spending that sum to one', () => {
    const total = selectSpendByCategory(buildState(dataset)).reduce(
      (sum, datum) => sum + datum.share,
      0,
    );
    expect(total).toBeCloseTo(1);
  });

  it('returns an empty list when nothing is selected', () => {
    expect(selectSpendByCategory(buildState([]))).toEqual([]);
  });
});

describe('selectIncomeByCategory', () => {
  it('aggregates income only', () => {
    const result = selectIncomeByCategory(buildState(dataset));
    expect(result).toEqual([{ category: 'Salary', totalMinor: 250_000, count: 1, share: 1 }]);
  });
});

describe('selectCashFlowByMonth', () => {
  it('buckets money in and out by calendar month, oldest first', () => {
    expect(selectCashFlowByMonth(buildState(dataset))).toEqual([
      { month: '2025-04', incomeMinor: 0, expenseMinor: 12_000, netMinor: -12_000, count: 1 },
      { month: '2025-05', incomeMinor: 0, expenseMinor: 8599, netMinor: -8599, count: 2 },
      { month: '2025-06', incomeMinor: 250_000, expenseMinor: 7500, netMinor: 242_500, count: 3 },
    ]);
  });

  it('handles a month boundary at midnight UTC', () => {
    const items = [
      makeTransaction({ date: '2025-06-30T23:59:59.000Z', amountMinor: 100 }),
      makeTransaction({ date: '2025-07-01T00:00:00.000Z', amountMinor: 200 }),
    ];
    const months = selectCashFlowByMonth(
      buildState(items, { filters: { dateFrom: '', dateTo: '' } }),
    );
    expect(months.map((datum) => datum.month)).toEqual(['2025-06', '2025-07']);
  });
});

describe('selectHasActiveFilters', () => {
  it('is false for the untouched filter state', () => {
    expect(selectHasActiveFilters(buildState(dataset))).toBe(false);
  });

  it('ignores whitespace-only searches', () => {
    expect(
      selectHasActiveFilters(buildState(dataset, { filters: { counterpartyQuery: '   ' } })),
    ).toBe(false);
  });

  it.each([
    ['a direction', { direction: 'income' as const }],
    ['a search query', { counterpartyQuery: 'tesco' }],
    ['a category', { categories: ['Travel' as const] }],
    ['a status', { statuses: ['pending' as const] }],
    ['a minimum amount', { minAmount: '10' }],
    ['a maximum amount', { maxAmount: '100' }],
  ])('is true with %s', (_label, filters) => {
    expect(selectHasActiveFilters(buildState(dataset, { filters }))).toBe(true);
  });
});

describe('memoisation', () => {
  it('recomputes only when the inputs actually change', () => {
    const state = buildState(dataset, { filters: { categories: ['Groceries'] } });
    const first = selectFilteredTransactions(state);
    expect(selectFilteredTransactions(state)).toBe(first);

    const changed = buildState(dataset, { filters: { categories: ['Transport'] } });
    expect(selectFilteredTransactions(changed)).not.toBe(first);
  });
});
