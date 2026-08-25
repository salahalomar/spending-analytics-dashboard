import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { filtersReset, sortChanged } from '@/features/filters/filtersSlice';
import { transactionSelected } from '@/features/ui/uiSlice';
import {
  selectTransactionsStatus,
  selectVisibleTransactions,
} from '@/features/transactions/selectors';
import { useVirtualizer } from '@/hooks/useVirtualizer';
import { formatCount } from '@/utils/format';
import type { SortField } from '@/types/transaction';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonRows } from '@/components/common/Skeleton';
import { TransactionDetail } from './TransactionDetail';
import { TransactionRow } from './TransactionRow';
import styles from './TransactionList.module.css';

export const ROW_HEIGHT = 56;
const OVERSCAN = 8;

const SORT_OPTIONS: readonly { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'amount', label: 'Amount' },
  { field: 'merchant', label: 'Merchant' },
];

export function TransactionList() {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(selectVisibleTransactions);
  const status = useAppSelector(selectTransactionsStatus);
  const selectedId = useAppSelector((state) => state.ui.selectedTransactionId);
  const { sortField, sortDirection } = useAppSelector((state) => state.filters);

  const { scrollRef, virtualItems, totalHeight, range, scrollToTop } =
    useVirtualizer<HTMLDivElement>({
      itemCount: transactions.length,
      itemHeight: ROW_HEIGHT,
      overscan: OVERSCAN,
    });

  // Changing the filters or the sort produces a different list; leaving the
  // user 12,000 rows down in it would be disorienting.
  useEffect(() => {
    scrollToTop();
  }, [transactions, scrollToTop]);

  const handleSelect = useCallback(
    (id: string) => {
      dispatch(transactionSelected(id));
    },
    [dispatch],
  );

  const isLoading = status === 'loading' || status === 'idle';

  return (
    <section
      className={styles.container}
      style={{ '--row-columns': 'minmax(0, 1fr) 130px 150px 108px 104px' } as React.CSSProperties}
      aria-label="Transactions"
      data-testid="transaction-list"
    >
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>Transactions</h2>
          <p className={styles.toolbarMeta} data-testid="rendered-count">
            {isLoading
              ? 'Loading…'
              : `${formatCount(transactions.length)} rows · ${virtualItems.length} rendered`}
          </p>
        </div>

        <div className={styles.sorts} role="group" aria-label="Sort transactions">
          {SORT_OPTIONS.map((option) => {
            const isActive = sortField === option.field;
            return (
              <button
                key={option.field}
                type="button"
                className={`${styles.sortButton} ${isActive ? styles.sortActive : ''}`}
                onClick={() => dispatch(sortChanged(option.field))}
                aria-pressed={isActive}
                data-testid={`sort-${option.field}`}
              >
                {option.label}
                {isActive ? (
                  <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : null}
                {isActive ? (
                  <span className="sr-only">
                    , sorted {sortDirection === 'asc' ? 'ascending' : 'descending'}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.columns} aria-hidden="true">
        <span>Merchant</span>
        <span>Category</span>
        <span>Date</span>
        <span>Status</span>
        <span className={styles.alignRight}>Amount</span>
      </div>

      {isLoading ? (
        <div style={{ padding: 16 }}>
          <SkeletonRows count={9} />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No matching transactions"
          message="No transactions match the current filters. Try widening the date range or clearing the merchant search."
          actionLabel="Reset filters"
          onAction={() => dispatch(filtersReset())}
        />
      ) : (
        <div className={styles.viewport} ref={scrollRef} data-testid="transaction-viewport">
          <div
            className={styles.canvas}
            style={{ height: totalHeight }}
            role="list"
            aria-label={`${formatCount(transactions.length)} transactions`}
          >
            {virtualItems.map((item) => {
              const transaction = transactions[item.index];
              if (!transaction) return null;
              return (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  offsetTop={item.offsetTop}
                  height={ROW_HEIGHT}
                  position={item.index + 1}
                  setSize={transactions.length}
                  isSelected={transaction.id === selectedId}
                  onSelect={handleSelect}
                />
              );
            })}
          </div>
        </div>
      )}

      <TransactionDetail />

      {!isLoading && transactions.length > 0 ? (
        <div className={styles.footer}>
          <span>
            Showing rows {formatCount(range.startIndex + 1)}–{formatCount(range.endIndex)} of{' '}
            {formatCount(transactions.length)}
          </span>
          <span>{virtualItems.length} DOM nodes</span>
        </div>
      ) : null}
    </section>
  );
}
