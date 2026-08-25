/**
 * Money is stored in minor units (pence) so that sums stay exact. Formatting
 * is the only place we convert to a floating-point major value.
 */
const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-GB');

const percentFormatter = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatCurrency(amountMinor: number): string {
  return currencyFormatter.format(amountMinor / 100);
}

/** `£1.2K` style output, for axis labels and tight stat tiles. */
export function formatCompactCurrency(amountMinor: number): string {
  return compactCurrencyFormatter.format(amountMinor / 100);
}

export function formatCount(value: number): string {
  return integerFormatter.format(value);
}

/** Takes a ratio (0.42), not a percentage (42). */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return percentFormatter.format(ratio);
}

/** Signed variant used by the trend indicator on the summary cards. */
export function formatSignedPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  const sign = ratio > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(ratio)}`;
}
