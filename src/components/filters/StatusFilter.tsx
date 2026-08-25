import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { statusToggled } from '@/features/filters/filtersSlice';
import type { TransactionStatus } from '@/types/transaction';
import { statusColorVar } from '@/utils/categoryColor';
import styles from './FilterPanel.module.css';

const STATUSES: readonly TransactionStatus[] = ['completed', 'pending', 'reverted'];

export function StatusFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((state) => state.filters.statuses);

  return (
    <div className={styles.group}>
      <span className={styles.groupLabel} id="status-filter-label">
        Status
      </span>

      <div className={styles.chips} role="group" aria-labelledby="status-filter-label">
        {STATUSES.map((status) => {
          const isSelected = selected.includes(status);
          return (
            <button
              key={status}
              type="button"
              className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
              onClick={() => dispatch(statusToggled(status))}
              aria-pressed={isSelected}
              data-testid={`status-chip-${status}`}
            >
              <span
                className={styles.chipDot}
                style={{ background: statusColorVar(status), borderRadius: '50%' }}
                aria-hidden="true"
              />
              {status}
            </button>
          );
        })}
      </div>
    </div>
  );
}
