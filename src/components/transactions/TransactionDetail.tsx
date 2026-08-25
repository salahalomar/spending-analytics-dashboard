import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { transactionDeselected } from '@/features/ui/uiSlice';
import { selectVisibleTransactions } from '@/features/transactions/selectors';
import { formatDate, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import styles from './TransactionDetail.module.css';

/**
 * Details for the selected row, docked below the list.
 *
 * Keeping the details out of the list itself is what lets the virtualiser
 * assume a single fixed row height — a row that grew on selection would make
 * every offset below it depend on the selection.
 */
export function TransactionDetail() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.ui.selectedTransactionId);
  const visible = useAppSelector(selectVisibleTransactions);

  if (selectedId === null) return null;

  const transaction = visible.find((candidate) => candidate.id === selectedId);
  // The selected row can fall outside the current filters.
  if (!transaction) return null;

  return (
    <div className={styles.wrapper}>
      <dl className={styles.panel} data-testid="transaction-detail">
        <div className={styles.field}>
          <dt>Merchant</dt>
          <dd>{transaction.merchant}</dd>
        </div>
        <div className={styles.field}>
          <dt>Amount</dt>
          <dd className="numeric">{formatCurrency(transaction.amountMinor)}</dd>
        </div>
        <div className={styles.field}>
          <dt>Category</dt>
          <dd>{transaction.category}</dd>
        </div>
        <div className={styles.field}>
          <dt>Date</dt>
          <dd>
            {formatDate(transaction.timestamp)} · {formatTime(transaction.timestamp)}
          </dd>
        </div>
        <div className={styles.field}>
          <dt>Payment method</dt>
          <dd>{transaction.paymentMethod}</dd>
        </div>
        <div className={styles.field}>
          <dt>Status</dt>
          <dd>{transaction.status}</dd>
        </div>
        <div className={styles.field}>
          <dt>Reference</dt>
          <dd className="numeric">{transaction.id}</dd>
        </div>
      </dl>
      <button
        type="button"
        className={styles.close}
        onClick={() => dispatch(transactionDeselected())}
        aria-label="Close transaction details"
        data-testid="close-detail"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
