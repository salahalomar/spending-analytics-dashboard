import { SummaryCards } from '@/components/summary/SummaryCards';
import { TransactionList } from '@/components/transactions/TransactionList';
import styles from './TransactionsPage.module.css';

/**
 * Every transaction, with the virtualised list and inline entry.
 *
 * Laid out as a fixed grid rather than a scrolling page so the list keeps a
 * definite height — the virtualiser needs one to know how many rows fit.
 */
export function TransactionsPage() {
  return (
    <div className={styles.page} data-testid="transactions-page">
      <SummaryCards />
      <TransactionList />
    </div>
  );
}
