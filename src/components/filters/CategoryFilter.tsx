import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { categoriesCleared, categoryToggled } from '@/features/filters/filtersSlice';
import { CATEGORIES, categoriesFor } from '@/types/transaction';
import { categoryColorVar } from '@/utils/categoryColor';
import styles from './FilterPanel.module.css';

export function CategoryFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((state) => state.filters.categories);
  const direction = useAppSelector((state) => state.filters.direction);

  // Showing income categories while filtered to spending would offer chips
  // that can only ever produce an empty list.
  const categories = direction === 'all' ? CATEGORIES : categoriesFor(direction);

  return (
    <div className={styles.group}>
      <div className={styles.panelHeader}>
        <span className={styles.groupLabel} id="category-filter-label">
          Category
        </span>
        <button
          type="button"
          className={styles.reset}
          onClick={() => dispatch(categoriesCleared())}
          disabled={selected.length === 0}
          data-testid="clear-categories"
        >
          All
        </button>
      </div>

      <div className={styles.chips} role="group" aria-labelledby="category-filter-label">
        {categories.map((category) => {
          const isSelected = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
              onClick={() => dispatch(categoryToggled(category))}
              aria-pressed={isSelected}
              data-testid={`category-chip-${category}`}
            >
              <span
                className={styles.chipDot}
                style={{ background: categoryColorVar(category) }}
                aria-hidden="true"
              />
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
