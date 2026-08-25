const MS_PER_DAY = 86_400_000;

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

const monthLabelFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

export function formatDate(timestamp: number): string {
  return shortDateFormatter.format(new Date(timestamp));
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp));
}

/** `Mar 25` — used for the x-axis of the spend-over-time chart. */
export function formatMonthLabel(monthKey: string): string {
  return monthLabelFormatter.format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

/** `2025-03` — the grouping key for monthly aggregation. */
export function toMonthKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 7);
}

/** `2025-03-14` — the value format used by `<input type="date">`. */
export function toDateInputValue(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Start of the given `YYYY-MM-DD` day in UTC. Returns `null` for empty or
 * malformed input so the filter can treat it as "unbounded".
 */
export function startOfDayMs(dateInput: string): number | null {
  if (!dateInput) return null;
  const parsed = Date.parse(`${dateInput}T00:00:00.000Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

/** End of the given day in UTC — inclusive upper bound for range filters. */
export function endOfDayMs(dateInput: string): number | null {
  const start = startOfDayMs(dateInput);
  return start === null ? null : start + MS_PER_DAY - 1;
}

/** Subtracts whole days from a `YYYY-MM-DD` value, keeping the same format. */
export function shiftDateInput(dateInput: string, days: number): string {
  const start = startOfDayMs(dateInput);
  if (start === null) return dateInput;
  return new Date(start + days * MS_PER_DAY).toISOString().slice(0, 10);
}
