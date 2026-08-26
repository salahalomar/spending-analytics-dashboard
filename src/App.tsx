import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loadTransactions } from '@/features/transactions/transactionsSlice';
import { loadObligations } from '@/features/ledger/ledgerSlice';
import {
  selectTransactionsError,
  selectTransactionsStatus,
} from '@/features/transactions/selectors';
import { selectLedgerStatus } from '@/features/ledger/selectors';
import { Header } from '@/components/layout/Header';
import { Nav } from '@/components/layout/Nav';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { LedgerPage } from '@/components/ledger/LedgerPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import styles from './App.module.css';

/** Pages driven by the transaction filters, which get the filter sidebar. */
function FilteredLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <FilterPanel />
      </div>
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}

/** Pages with their own data, which take the full width. */
function PlainLayout() {
  return (
    <div className={`${styles.layout} ${styles.layoutFullWidth}`}>
      <div className={`${styles.main} ${styles.scrollable}`}>
        <Outlet />
      </div>
    </div>
  );
}

export function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectTransactionsStatus);
  const ledgerStatus = useAppSelector(selectLedgerStatus);
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

  useEffect(() => {
    if (ledgerStatus === 'idle') {
      void dispatch(loadObligations());
    }
  }, [ledgerStatus, dispatch]);

  if (status === 'failed') {
    return (
      <div className={styles.app}>
        <Header />
        <div className={styles.error} role="alert">
          <p>{error ?? 'Something went wrong while loading your data.'}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => void dispatch(loadTransactions())}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Header />
      <Nav />

      <Routes>
        <Route element={<FilteredLayout />}>
          <Route index element={<OverviewScroller />} />
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>

        <Route element={<PlainLayout />}>
          <Route path="owed-to-me" element={<LedgerPage direction="receivable" />} />
          <Route path="i-owe" element={<LedgerPage direction="payable" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/** The overview flows rather than filling, so it needs its own scroll box. */
function OverviewScroller() {
  return (
    <div className={styles.scrollable}>
      <OverviewPage />
    </div>
  );
}
