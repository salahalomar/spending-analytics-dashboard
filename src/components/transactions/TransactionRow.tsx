import { memo } from 'react';
import type { Transaction } from '@/types/transaction';
import { categoryColorVar, statusColorVar } from '@/utils/categoryColor';
import { formatDate, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import styles from './TransactionList.module.css';

interface TransactionRowProps {
  transaction: Transaction;
  offsetTop: number;
  height: number;
  /** 1-based position in the full list, announced to screen readers. */
  position: number;
  setSize: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/** First letter of the merchant, used for the coloured avatar. */
function initialOf(merchant: string): string {
  return merchant.charAt(0).toUpperCase();
}

/**
 * A single row. Memoised because scrolling re-renders the list on every frame
 * and rows that stay inside the window receive identical props.
 */
function TransactionRowComponent({
  transaction,
  offsetTop,
  height,
  position,
  setSize,
  isSelected,
  onSelect,
}: TransactionRowProps) {
  const color = categoryColorVar(transaction.category);

  return (
    <div
      className={styles.rowWrapper}
      style={{ transform: `translateY(${offsetTop}px)`, height }}
      role="listitem"
      aria-setsize={setSize}
      aria-posinset={position}
    >
      <button
        type="button"
        className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
        onClick={() => onSelect(transaction.id)}
        aria-expanded={isSelected}
        data-testid="transaction-row"
        data-transaction-id={transaction.id}
      >
        <span className={styles.merchantCell}>
          <span className={styles.avatar} style={{ background: color }} aria-hidden="true">
            {initialOf(transaction.merchant)}
          </span>
          <span className={styles.merchantText}>
            <span className={styles.merchantName}>{transaction.merchant}</span>
            <span className={styles.merchantSub}>{transaction.description}</span>
          </span>
        </span>

        <span className={styles.categoryCell}>
          <span className={styles.categoryDot} style={{ background: color }} aria-hidden="true" />
          {transaction.category}
        </span>

        <span className={styles.dateCell}>
          {formatDate(transaction.timestamp)}
          {' · '}
          {formatTime(transaction.timestamp)}
        </span>

        <span className={styles.statusCell}>
          <span
            className={styles.statusDot}
            style={{ background: statusColorVar(transaction.status) }}
            aria-hidden="true"
          />
          {transaction.status}
        </span>

        <span className={`${styles.amountCell} numeric`}>{formatCurrency(transaction.amountMinor)}</span>
      </button>
    </div>
  );
}

export const TransactionRow = memo(TransactionRowComponent);
