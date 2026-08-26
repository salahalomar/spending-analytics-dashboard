import { useMemo, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { useNow } from '@/hooks/useNow';
import {
  selectPayables,
  selectReceivables,
  sortViews,
  summariseObligations,
  toViews,
} from '@/features/ledger/selectors';
import { AGEING_BUCKETS, type ObligationDirection } from '@/types/ledger';
import { formatCount, formatCurrency } from '@/utils/format';
import { LedgerForm } from './LedgerForm';
import { LedgerTable } from './LedgerTable';
import styles from './LedgerPage.module.css';

interface LedgerPageProps {
  direction: ObligationDirection;
}

/**
 * One page serving both sides of the ledger.
 *
 * What you owe and what you are owed differ only in wording and in which way
 * the totals lean, so building this twice would double the surface area for
 * no benefit.
 */
export function LedgerPage({ direction }: LedgerPageProps) {
  const isReceivable = direction === 'receivable';
  const obligations = useAppSelector(isReceivable ? selectReceivables : selectPayables);
  const [formOpen, setFormOpen] = useState(false);

  // Read the clock once per render rather than inside the pure helpers, so
  // every figure on the page is derived from the same instant.
  const nowMs = useNow();

  const { views, summary } = useMemo(
    () => ({
      views: sortViews(toViews(obligations, nowMs)),
      summary: summariseObligations(obligations, nowMs),
    }),
    [obligations, nowMs],
  );

  return (
    <div className={styles.page} data-testid={`ledger-page-${direction}`}>
      <div className={styles.summaryGrid}>
        <article className={styles.card}>
          <span className={styles.label}>{isReceivable ? 'Owed to you' : 'You owe'}</span>
          <span className={`${styles.value} numeric`} data-testid="ledger-outstanding">
            {formatCurrency(summary.outstandingMinor)}
          </span>
          <p className={styles.meta}>
            across {formatCount(summary.openCount)} {summary.openCount === 1 ? 'record' : 'records'}
          </p>
        </article>

        <article className={`${styles.card} ${summary.overdueCount > 0 ? styles.cardAlert : ''}`}>
          <span className={styles.label}>Overdue</span>
          <span
            className={`${styles.value} ${summary.overdueCount > 0 ? styles.valueAlert : ''} numeric`}
            data-testid="ledger-overdue"
          >
            {formatCurrency(summary.overdueMinor)}
          </span>
          <p className={styles.meta}>
            {summary.overdueCount === 0
              ? 'nothing past its date'
              : `${formatCount(summary.overdueCount)} past ${isReceivable ? 'the agreed date' : 'due'}`}
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Due within 30 days</span>
          <span className={`${styles.value} numeric`} data-testid="ledger-due-soon">
            {formatCurrency(summary.dueSoonMinor)}
          </span>
          <p className={styles.meta}>{formatCount(summary.dueSoonCount)} coming up</p>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>{isReceivable ? 'Received' : 'Paid off'}</span>
          <span className={`${styles.value} numeric`} data-testid="ledger-settled">
            {formatCurrency(summary.settledMinor)}
          </span>
          <p className={styles.meta}>settled in full</p>
        </article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>
              {isReceivable ? 'Money owed to you' : 'Money you owe'}
            </h2>
            <p className={styles.panelMeta}>
              {formatCount(views.length)} {views.length === 1 ? 'record' : 'records'}
            </p>
          </div>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            data-testid="toggle-ledger-form"
          >
            {formOpen
              ? 'Close'
              : isReceivable
                ? 'Add someone who owes you'
                : 'Add something you owe'}
          </button>
        </div>

        {formOpen ? <LedgerForm direction={direction} onDone={() => setFormOpen(false)} /> : null}

        <LedgerTable views={views} direction={direction} onAdd={() => setFormOpen(true)} />

        {summary.openCount > 0 ? (
          <div className={styles.ageing} data-testid="ledger-ageing">
            {AGEING_BUCKETS.map((bucket) => (
              <div key={bucket.id} className={styles.ageingCell}>
                <span className={styles.ageingLabel}>{bucket.label}</span>
                <span className={styles.ageingValue}>
                  {formatCurrency(summary.ageing[bucket.id])}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
