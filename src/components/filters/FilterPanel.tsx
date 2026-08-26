import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { filtersReset } from '@/features/filters/filtersSlice';
import {
  selectHasActiveFilters,
  selectTotalCount,
  selectVisibleCount,
} from '@/features/transactions/selectors';
import { formatCount } from '@/utils/format';
import { AmountFilter } from './AmountFilter';
import { CategoryFilter } from './CategoryFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { CounterpartySearch } from './CounterpartySearch';
import { DirectionFilter } from './DirectionFilter';
import { StatusFilter } from './StatusFilter';
import styles from './FilterPanel.module.css';

export function FilterPanel() {
  const dispatch = useAppDispatch();
  const visibleCount = useAppSelector(selectVisibleCount);
  const totalCount = useAppSelector(selectTotalCount);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);

  return (
    <aside className={styles.panel} aria-label="Filters" data-testid="filter-panel">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Filters</h2>
        <button
          type="button"
          className={styles.reset}
          onClick={() => dispatch(filtersReset())}
          data-testid="reset-filters"
        >
          Reset
        </button>
      </div>

      <DirectionFilter />
      <CounterpartySearch />
      <CategoryFilter />
      <StatusFilter />
      <DateRangeFilter />
      <AmountFilter />

      <p className={styles.resultCount} data-testid="result-count" aria-live="polite">
        <strong>{formatCount(visibleCount)}</strong> of {formatCount(totalCount)} transactions
        {hasActiveFilters ? ' match' : ''}
      </p>
    </aside>
  );
}
