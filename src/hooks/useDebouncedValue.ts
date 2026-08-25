import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delayMs`.
 *
 * The merchant search box writes to local state on every keystroke so typing
 * stays responsive, and only the debounced value reaches the store — otherwise
 * each character would re-run the filter over the whole dataset.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
