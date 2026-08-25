import { useAppSelector } from '@/app/hooks';
import { selectSummary } from '@/features/transactions/selectors';
import { formatCurrency, formatCount, formatPercent, formatSignedPercent } from '@/utils/format';
import { categoryColorVar } from '@/utils/categoryColor';
import styles from './SummaryCards.module.css';

export function SummaryCards() {
  const summary = useAppSelector(selectSummary);
  const { changeRatio } = summary;

  return (
    <div className={styles.grid} data-testid="summary-cards">
      <article className={styles.card}>
        <span className={styles.label}>Total spend</span>
        <span className={`${styles.value} numeric`} data-testid="summary-total">
          {formatCurrency(summary.totalMinor)}
        </span>
        <div className={styles.meta}>
          {changeRatio === null ? (
            <span>No comparable prior period</span>
          ) : (
            <>
              <span
                className={`${styles.trend} ${changeRatio > 0 ? styles.up : styles.down}`}
                data-testid="summary-trend"
              >
                {changeRatio > 0 ? '▲' : '▼'} {formatSignedPercent(changeRatio)}
              </span>
              <span>vs previous period</span>
            </>
          )}
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Transactions</span>
        <span className={`${styles.value} numeric`} data-testid="summary-count">
          {formatCount(summary.count)}
        </span>
        <div className={styles.meta}>
          <span>in the current selection</span>
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Average</span>
        <span className={`${styles.value} numeric`} data-testid="summary-average">
          {formatCurrency(summary.averageMinor)}
        </span>
        <div className={styles.meta}>
          <span>largest {formatCurrency(summary.largestMinor)}</span>
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.label}>Top category</span>
        <span className={styles.value} data-testid="summary-top-category">
          {summary.topCategory ?? '—'}
        </span>
        <div className={styles.meta}>
          {summary.topCategory ? (
            <>
              <span
                className={styles.swatch}
                style={{ background: categoryColorVar(summary.topCategory) }}
                aria-hidden="true"
              />
              <span>
                {formatCurrency(summary.topCategoryMinor)} ·{' '}
                {formatPercent(
                  summary.totalMinor === 0 ? 0 : summary.topCategoryMinor / summary.totalMinor,
                )}
              </span>
            </>
          ) : (
            <span>Nothing to show</span>
          )}
        </div>
      </article>
    </div>
  );
}
