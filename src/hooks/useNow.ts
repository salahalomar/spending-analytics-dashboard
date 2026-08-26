import { useSyncExternalStore } from 'react';

const TICK_MS = 60_000;

/**
 * The current time, read the way React wants an external mutable value read.
 *
 * Calling `Date.now()` in a render body is impure: two renders of the same
 * component can disagree, which for this app means a row could be drawn as
 * overdue while the total above it was computed a moment earlier and says
 * otherwise.
 *
 * The snapshot is floored to the minute so it stays referentially stable
 * between ticks — `useSyncExternalStore` re-renders whenever the snapshot
 * changes, and an unrounded clock would change on every single read.
 *
 * The interval also means a page left open overnight notices that yesterday's
 * due dates have passed.
 */
function subscribe(onStoreChange: () => void): () => void {
  const id = setInterval(onStoreChange, TICK_MS);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
