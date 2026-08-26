import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { transactionDeselected } from '@/features/ui/uiSlice';
import { deleteTransaction } from '@/features/transactions/transactionsSlice';
import { selectVisibleTransactions } from '@/features/transactions/selectors';
import { formatDate, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import styles from './TransactionDetail.module.css';

/** Referenced by each row's `aria-controls`. */
export const TRANSACTION_DETAIL_ID = 'transaction-detail-panel';

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

  // Closing removes the button that had focus, which would drop the caret back
  // to the top of the document. Hand it to the row the panel described.
  const handleClose = useCallback(() => {
    const row = selectedId
      ? document.querySelector<HTMLElement>(`[data-transaction-id="${selectedId}"]`)
      : null;
    dispatch(transactionDeselected());
    row?.focus();
  }, [dispatch, selectedId]);

  if (selectedId === null) return null;

  const transaction = visible.find((candidate) => candidate.id === selectedId);
  // The selected row can fall outside the current filters.
  if (!transaction) return null;

  return (
    <div className={styles.wrapper}>
      <dl className={styles.panel} id={TRANSACTION_DETAIL_ID} data-testid="transaction-detail">
        <div className={styles.field}>
          <dt>{transaction.direction === 'income' ? 'From' : 'Paid to'}</dt>
          <dd>{transaction.counterparty}</dd>
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
          <dt>Note</dt>
          <dd>{transaction.description || '—'}</dd>
        </div>
        <div className={styles.field}>
          <dt>Reference</dt>
          <dd className="numeric">{transaction.id}</dd>
        </div>
        {transaction.userEntered ? (
          <div className={styles.field}>
            <dt>Actions</dt>
            <dd>
              <button
                type="button"
                className={styles.delete}
                onClick={() => {
                  void dispatch(deleteTransaction(transaction.id));
                  dispatch(transactionDeselected());
                }}
                data-testid="delete-transaction"
              >
                Delete
              </button>
            </dd>
          </div>
        ) : null}
      </dl>
      <button
        type="button"
        className={styles.close}
        onClick={handleClose}
        aria-label="Close transaction details"
        data-testid="close-detail"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
