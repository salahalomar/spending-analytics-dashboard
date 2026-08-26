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

const integerFormatter = new Intl.NumberFormat('en-GB');

const percentFormatter = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatCurrency(amountMinor: number): string {
  return currencyFormatter.format(amountMinor / 100);
}

const COMPACT_UNITS = [
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
] as const;

/**
 * `£1.2K` style output, for axis labels and tight stat tiles.
 *
 * Deliberately not `Intl`'s compact notation: that varies with the host's ICU
 * version — £500 on one runtime, £0.5K on another — which made axis labels
 * differ between browsers and broke the tests between Node versions. Rolling
 * it by hand keeps the chart identical everywhere.
 */
export function formatCompactCurrency(amountMinor: number): string {
  const value = amountMinor / 100;
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  for (const { threshold, suffix } of COMPACT_UNITS) {
    if (magnitude >= threshold) {
      const scaled = magnitude / threshold;
      // One decimal below ten, none above: £1.2K, £12K, £120K.
      const digits =
        scaled < 10 ? stripTrailingZero(scaled.toFixed(1)) : String(Math.round(scaled));
      return `${sign}£${digits}${suffix}`;
    }
  }

  return `${sign}£${Math.round(magnitude)}`;
}

function stripTrailingZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function formatCount(value: number): string {
  return integerFormatter.format(value);
}

/** Takes a ratio (0.42), not a percentage (42). */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return percentFormatter.format(ratio);
}

/** `+£120.00` / `-£45.00` — used wherever a net figure can go either way. */
export function formatSignedCurrency(amountMinor: number): string {
  const formatted = currencyFormatter.format(Math.abs(amountMinor) / 100);
  if (amountMinor > 0) return `+${formatted}`;
  if (amountMinor < 0) return `-${formatted}`;
  return formatted;
}

/** Signed variant used by the trend indicator on the summary cards. */
export function formatSignedPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  const sign = ratio > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(ratio)}`;
}
