import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loadTransactions } from '@/features/transactions/transactionsSlice';
import {
  selectTransactionsError,
  selectTransactionsStatus,
} from '@/features/transactions/selectors';
import { Header } from '@/components/layout/Header';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { SummaryCards } from '@/components/summary/SummaryCards';
import { ChartCard } from '@/components/charts/ChartCard';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { TransactionList } from '@/components/transactions/TransactionList';
import styles from './App.module.css';

export function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectTransactionsStatus);
  const error = useAppSelector(selectTransactionsError);
  const theme = useAppSelector((state) => state.ui.theme);

  // Keep the document in sync with the store so the CSS tokens switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(loadTransactions());
    }
  }, [status, dispatch]);

  return (
    <div className={styles.app}>
      <Header />

      {status === 'failed' ? (
        <div className={styles.error} role="alert">
          <p>{error ?? 'Something went wrong while building the dataset.'}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => void dispatch(loadTransactions())}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <FilterPanel />
          </div>

          <div className={styles.content}>
            <SummaryCards />

            <div className={styles.charts}>
              <ChartCard title="Spend over time" caption="Monthly total" testId="chart-monthly">
                <MonthlyTrendChart />
              </ChartCard>

              <ChartCard
                title="Spend by category"
                caption="Click a bar to filter"
                testId="chart-category"
              >
                <CategoryBarChart />
              </ChartCard>
            </div>

            <TransactionList />
          </div>
        </div>
      )}
    </div>
  );
}
