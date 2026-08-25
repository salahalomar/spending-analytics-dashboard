import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { themeToggled } from '@/features/ui/uiSlice';
import { selectGeneratedInMs, selectAllTransactions } from '@/features/transactions/selectors';
import { formatCount } from '@/utils/format';
import styles from './Header.module.css';

export function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const generatedInMs = useAppSelector(selectGeneratedInMs);
  const total = useAppSelector(selectAllTransactions).length;

  const subtitle =
    total === 0
      ? 'Generating dataset…'
      : `${formatCount(total)} transactions${generatedInMs === null ? '' : ` · generated in ${generatedInMs}ms`}`;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V11" strokeLinecap="round" />
            <path d="M10 19V5" strokeLinecap="round" />
            <path d="M16 19v-6" strokeLinecap="round" />
            <path d="M22 19H2" strokeLinecap="round" />
          </svg>
        </span>
        <div className={styles.titles}>
          <h1 className={styles.title}>Spending Analytics</h1>
          <p className={styles.subtitle} data-testid="dataset-summary">
            {subtitle}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={() => dispatch(themeToggled())}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          data-testid="theme-toggle"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
