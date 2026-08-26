import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { directionChanged, type DirectionFilter as Direction } from '@/features/filters/filtersSlice';
import styles from './FilterPanel.module.css';

const OPTIONS: readonly { id: Direction; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Money in' },
  { id: 'expense', label: 'Money out' },
];

/** Switches the whole dashboard between money in, money out, or both. */
export function DirectionFilter() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((state) => state.filters.direction);

  return (
    <div className={styles.group}>
      <span className={styles.groupLabel} id="direction-filter-label">
        Show
      </span>
      <div className={styles.segmented} role="group" aria-labelledby="direction-filter-label">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.segment} ${active === option.id ? styles.segmentActive : ''}`}
            onClick={() => dispatch(directionChanged(option.id))}
            aria-pressed={active === option.id}
            data-testid={`direction-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
