import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { categoryToggled } from '@/features/filters/filtersSlice';
import { selectSpendByCategory } from '@/features/transactions/selectors';
import { categoryColorVar } from '@/utils/categoryColor';
import { formatCurrency, formatPercent } from '@/utils/format';
import styles from './CategoryBarChart.module.css';

/**
 * Horizontal bars of spend per category.
 *
 * Bars are widths relative to the largest category rather than to total spend,
 * so the smaller categories stay readable. Clicking a bar toggles that
 * category in the filters — the chart doubles as a control.
 */
export function CategoryBarChart() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectSpendByCategory);
  const selected = useAppSelector((state) => state.filters.categories);

  if (data.length === 0) {
    return <p className={styles.empty}>No spend in this selection.</p>;
  }

  const maxTotal = data[0]!.totalMinor;

  return (
    <ul className={styles.list} data-testid="category-bar-chart">
      {data.map((datum) => {
        const widthPercent = maxTotal === 0 ? 0 : (datum.totalMinor / maxTotal) * 100;
        const isSelected = selected.includes(datum.category);

        return (
          <li key={datum.category} className={styles.row}>
            <span className={styles.name}>
              <span
                className={styles.dot}
                style={{ background: categoryColorVar(datum.category) }}
                aria-hidden="true"
              />
              {datum.category}
            </span>

            <button
              type="button"
              className={styles.track}
              onClick={() => dispatch(categoryToggled(datum.category))}
              aria-pressed={isSelected}
              aria-label={`${datum.category}: ${formatCurrency(datum.totalMinor)} across ${datum.count} transactions. Toggle filter.`}
              data-testid={`category-bar-${datum.category}`}
            >
              <span
                className={styles.bar}
                style={{
                  width: `${widthPercent}%`,
                  background: categoryColorVar(datum.category),
                  opacity: isSelected || selected.length === 0 ? 1 : 0.35,
                }}
              />
            </button>

            <span className={`${styles.amount} numeric`}>
              {formatCurrency(datum.totalMinor)}
              <span className={styles.share}>{formatPercent(datum.share)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
