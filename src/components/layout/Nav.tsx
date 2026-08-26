import { NavLink } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectPayables, selectReceivables, summariseObligations } from '@/features/ledger/selectors';
import styles from './Nav.module.css';

/**
 * Top-level sections.
 *
 * The overdue counts sit in the navigation rather than only on the pages
 * themselves — a debt you have forgotten about is exactly the thing you will
 * not click through to find.
 */
export function Nav() {
  const receivables = useAppSelector(selectReceivables);
  const payables = useAppSelector(selectPayables);

  const nowMs = Date.now();
  const owedOverdue = summariseObligations(receivables, nowMs).overdueCount;
  const owingOverdue = summariseObligations(payables, nowMs).overdueCount;

  const className = ({ isActive }: { isActive: boolean }) =>
    `${styles.link} ${isActive ? styles.active : ''}`;

  return (
    <nav className={styles.nav} aria-label="Sections">
      <NavLink to="/" end className={className} data-testid="nav-overview">
        Overview
      </NavLink>
      <NavLink to="/transactions" className={className} data-testid="nav-transactions">
        Transactions
      </NavLink>
      <NavLink to="/owed-to-me" className={className} data-testid="nav-owed-to-me">
        Owed to me
        {owedOverdue > 0 ? (
          <span className={styles.badge} aria-label={`${owedOverdue} overdue`}>
            {owedOverdue}
          </span>
        ) : null}
      </NavLink>
      <NavLink to="/i-owe" className={className} data-testid="nav-i-owe">
        I owe
        {owingOverdue > 0 ? (
          <span className={styles.badge} aria-label={`${owingOverdue} overdue`}>
            {owingOverdue}
          </span>
        ) : null}
      </NavLink>
    </nav>
  );
}
