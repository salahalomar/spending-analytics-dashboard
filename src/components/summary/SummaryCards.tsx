import { useAppSelector } from '@/app/hooks';
import { selectSummary } from '@/features/transactions/selectors';
import {
  formatCurrency,
  formatCount,
  formatSignedCurrency,
  formatSignedPercent,
} from '@/utils/format';
import styles from './SummaryCards.module.css';

/**
 * The four figures worth seeing first: what came in, what went out, whether
 * you are up or down, and where the money went.
 */
export function SummaryCards() {
  const summary = useAppSelector(selectSummary);
  const { spendChangeRatio, netMinor } = summary;
  const isPositive = netMinor >= 0;

  return (
    <div className={styles.grid} data-testid="summary-cards">
      <article className={styles.card}>
        <span className={styles.label}>Money in</span>
        <span className={`${styles.value} ${styles.positive} numeric`} data-testid="summary-income">
          {formatCurrency(summary.incomeMinor)}
        </span>
        <div className={styles.meta}>
          <span>across the selected period</span>
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Money out</span>
        <span
          className={`${styles.value} ${styles.negative} numeric`}
          data-testid="summary-expense"
        >
          {formatCurrency(summary.expenseMinor)}
        </span>
        <div className={styles.meta}>
          {spendChangeRatio === null ? (
            <span>No comparable prior period</span>
          ) : (
            <>
              <span
                className={`${styles.trend} ${spendChangeRatio > 0 ? styles.up : styles.down}`}
                data-testid="summary-trend"
              >
                {spendChangeRatio > 0 ? '▲' : '▼'} {formatSignedPercent(spendChangeRatio)}
              </span>
              <span>vs previous period</span>
            </>
          )}
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Net position</span>
        <span
          className={`${styles.value} ${isPositive ? styles.positive : styles.negative} numeric`}
          data-testid="summary-net"
        >
          {formatSignedCurrency(netMinor)}
        </span>
        <div className={styles.meta}>
          <span>{isPositive ? 'more came in than went out' : 'more went out than came in'}</span>
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Biggest cost</span>
        <span className={styles.value} data-testid="summary-top-category">
          {summary.topCategory ?? '—'}
        </span>
        <div className={styles.meta}>
          {summary.topCategory ? (
            <span>
              {formatCurrency(summary.topCategoryMinor)} · {formatCount(summary.count)} transactions
            </span>
          ) : (
            <span>Nothing to show</span>
          )}
        </div>
      </article>
    </div>
  );
}
