import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { maxAmountChanged, minAmountChanged } from '@/features/filters/filtersSlice';
import styles from './FilterPanel.module.css';

export function AmountFilter() {
  const dispatch = useAppDispatch();
  const { minAmount, maxAmount } = useAppSelector((state) => state.filters);

  return (
    <div className={styles.group}>
      <span className={styles.groupLabel} id="amount-filter-label">
        Amount (£)
      </span>
      <div className={styles.dateRow} role="group" aria-labelledby="amount-filter-label">
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="min-amount">
            Min
          </label>
          <input
            id="min-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className={styles.input}
            placeholder="0"
            value={minAmount}
            onChange={(event) => dispatch(minAmountChanged(event.target.value))}
            data-testid="min-amount"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="max-amount">
            Max
          </label>
          <input
            id="max-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className={styles.input}
            placeholder="Any"
            value={maxAmount}
            onChange={(event) => dispatch(maxAmountChanged(event.target.value))}
            data-testid="max-amount"
          />
        </div>
      </div>
    </div>
  );
}
