import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { useNow } from '@/hooks/useNow';
import { selectSummary } from '@/features/transactions/selectors';
import {
  groupByCounterparty,
  netPosition,
  selectPayables,
  selectReceivables,
} from '@/features/ledger/selectors';
import { formatCount, formatCurrency, formatSignedCurrency } from '@/utils/format';
import { ChartCard } from '@/components/charts/ChartCard';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import styles from './OverviewPage.module.css';

/**
 * The whole picture on one screen: what came in, what went out, whether you
 * are ahead, and what is still outstanding in either direction.
 */
export function OverviewPage() {
  const summary = useAppSelector(selectSummary);
  const receivables = useAppSelector(selectReceivables);
  const payables = useAppSelector(selectPayables);

  // One clock reading for the whole page, so every figure agrees.
  const nowMs = useNow();

  const { position, topDebtors, topCreditors } = useMemo(
    () => ({
      position: netPosition(receivables, payables, nowMs),
      topDebtors: groupByCounterparty(receivables, nowMs).slice(0, 5),
      topCreditors: groupByCounterparty(payables, nowMs).slice(0, 5),
    }),
    [receivables, payables, nowMs],
  );

  const netIsPositive = summary.netMinor >= 0;

  return (
    <div className={styles.page} data-testid="overview-page">
      <div className={styles.headline}>
        <article className={styles.card}>
          <span className={styles.label}>Money in</span>
          <span className={`${styles.value} ${styles.positive} numeric`} data-testid="overview-income">
            {formatCurrency(summary.incomeMinor)}
          </span>
          <p className={styles.meta}>in the selected period</p>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Money out</span>
          <span className={`${styles.value} ${styles.negative} numeric`} data-testid="overview-expense">
            {formatCurrency(summary.expenseMinor)}
          </span>
          <p className={styles.meta}>in the selected period</p>
        </article>

        <article className={styles.card}>
          <span className={styles.label}>Net</span>
          <span
            className={`${styles.value} ${netIsPositive ? styles.positive : styles.negative} numeric`}
            data-testid="overview-net"
          >
            {formatSignedCurrency(summary.netMinor)}
          </span>
          <p className={styles.meta}>{netIsPositive ? 'you are ahead' : 'you are behind'}</p>
        </article>

        <Link to="/owed-to-me" className={`${styles.card} ${styles.cardLink}`}>
          <span className={styles.label}>Owed to you</span>
          <span className={`${styles.value} numeric`} data-testid="overview-owed-to-you">
            {formatCurrency(position.owedToYouMinor)}
          </span>
          <p className={styles.meta}>
            {position.overdueToYouMinor > 0
              ? `${formatCurrency(position.overdueToYouMinor)} overdue`
              : 'nothing overdue'}
          </p>
        </Link>

        <Link to="/i-owe" className={`${styles.card} ${styles.cardLink}`}>
          <span className={styles.label}>You owe</span>
          <span className={`${styles.value} numeric`} data-testid="overview-you-owe">
            {formatCurrency(position.youOweMinor)}
          </span>
          <p className={styles.meta}>
            {position.overdueByYouMinor > 0
              ? `${formatCurrency(position.overdueByYouMinor)} overdue`
              : 'nothing overdue'}
          </p>
        </Link>
      </div>

      {position.overdueByYouMinor > 0 || position.overdueToYouMinor > 0 ? (
        <div className={styles.alerts} data-testid="overview-alerts">
          {position.overdueByYouMinor > 0 ? (
            <div className={styles.alert}>
              <svg
                className={styles.alertIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              You have {formatCurrency(position.overdueByYouMinor)} of debt past its due date.
              <Link to="/i-owe" className={styles.alertLink}>
                Review →
              </Link>
            </div>
          ) : null}

          {position.overdueToYouMinor > 0 ? (
            <div className={styles.alert}>
              <svg
                className={styles.alertIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              {formatCurrency(position.overdueToYouMinor)} owed to you is overdue.
              <Link to="/owed-to-me" className={styles.alertLink}>
                Chase it →
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.charts}>
        <ChartCard title="Money in and out" caption="By month" testId="chart-cash-flow">
          <div className={styles.chartBody}>
            <CashFlowChart />
          </div>
        </ChartCard>

        <ChartCard title="Where it goes" caption="Click a bar to filter" testId="chart-category">
          <div className={styles.categoryBody}>
            <CategoryBarChart />
          </div>
        </ChartCard>
      </div>

      <div className={styles.split}>
        <section className={styles.panel} data-testid="top-debtors">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Who owes you most</h2>
            <Link to="/owed-to-me" className={styles.panelLink}>
              See all
            </Link>
          </div>
          {topDebtors.length === 0 ? (
            <p className={styles.emptyNote}>Nobody owes you anything right now.</p>
          ) : (
            <ul className={styles.list}>
              {topDebtors.map((entry) => (
                <li key={entry.counterparty} className={styles.listRow}>
                  <span className={styles.listName}>{entry.counterparty}</span>
                  {entry.overdue ? <span className={styles.listBadge}>overdue</span> : null}
                  <span className={styles.listAmount}>
                    {formatCurrency(entry.outstandingMinor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} data-testid="top-creditors">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Who you owe most</h2>
            <Link to="/i-owe" className={styles.panelLink}>
              See all
            </Link>
          </div>
          {topCreditors.length === 0 ? (
            <p className={styles.emptyNote}>You have no debts recorded.</p>
          ) : (
            <ul className={styles.list}>
              {topCreditors.map((entry) => (
                <li key={entry.counterparty} className={styles.listRow}>
                  <span className={styles.listName}>{entry.counterparty}</span>
                  {entry.overdue ? <span className={styles.listBadge}>overdue</span> : null}
                  <span className={styles.listAmount}>
                    {formatCurrency(entry.outstandingMinor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className={styles.meta}>
        Showing {formatCount(summary.count)} transactions in the selected period.
      </p>
    </div>
  );
}
