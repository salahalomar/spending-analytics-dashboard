import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  DATE_PRESETS,
  dateFromChanged,
  datePresetApplied,
  dateToChanged,
} from '@/features/filters/filtersSlice';
import styles from './FilterPanel.module.css';

export function DateRangeFilter() {
  const dispatch = useAppDispatch();
  const { dateFrom, dateTo } = useAppSelector((state) => state.filters);

  return (
    <div className={styles.group}>
      <span className={styles.groupLabel} id="date-filter-label">
        Date range
      </span>

      <div className={styles.presets} role="group" aria-labelledby="date-filter-label">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={styles.chip}
            onClick={() => dispatch(datePresetApplied(preset.id))}
            data-testid={`date-preset-${preset.id}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className={styles.dateRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="date-from">
            From
          </label>
          <input
            id="date-from"
            type="date"
            className={styles.input}
            value={dateFrom}
            max={dateTo}
            onChange={(event) => dispatch(dateFromChanged(event.target.value))}
            data-testid="date-from"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="date-to">
            To
          </label>
          <input
            id="date-to"
            type="date"
            className={styles.input}
            value={dateTo}
            min={dateFrom}
            onChange={(event) => dispatch(dateToChanged(event.target.value))}
            data-testid="date-to"
          />
        </div>
      </div>
    </div>
  );
}
