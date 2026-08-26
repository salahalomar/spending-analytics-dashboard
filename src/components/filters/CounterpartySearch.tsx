import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { merchantQueryChanged } from '@/features/filters/filtersSlice';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import styles from './FilterPanel.module.css';

const DEBOUNCE_MS = 200;

/**
 * Keeps the typed value in local state and only pushes the debounced value to
 * the store, so a keystroke costs a single input re-render rather than a
 * re-filter of the whole dataset.
 */
export function MerchantSearch() {
  const dispatch = useAppDispatch();
  const storeQuery = useAppSelector((state) => state.filters.merchantQuery);

  const [draft, setDraft] = useState(storeQuery);
  const debouncedDraft = useDebouncedValue(draft, DEBOUNCE_MS);
  const lastSynced = useRef(storeQuery);

  useEffect(() => {
    if (debouncedDraft === lastSynced.current) return;
    lastSynced.current = debouncedDraft;
    dispatch(merchantQueryChanged(debouncedDraft));
  }, [debouncedDraft, dispatch]);

  // Pull external changes — "Reset filters", for instance — back into the box.
  useEffect(() => {
    if (storeQuery !== lastSynced.current) {
      lastSynced.current = storeQuery;
      setDraft(storeQuery);
    }
  }, [storeQuery]);

  return (
    <div className={styles.group}>
      <label className={styles.groupLabel} htmlFor="merchant-search">
        Merchant
      </label>
      <div className={styles.searchWrap}>
        <svg
          className={styles.searchIcon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" strokeLinecap="round" />
        </svg>
        <input
          id="merchant-search"
          type="search"
          className={`${styles.input} ${styles.searchInput}`}
          placeholder="Search merchants…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
          data-testid="merchant-search"
        />
        {draft !== '' ? (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setDraft('')}
            aria-label="Clear merchant search"
            data-testid="clear-merchant-search"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
