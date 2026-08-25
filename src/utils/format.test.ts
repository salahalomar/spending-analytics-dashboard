import {
  formatCompactCurrency,
  formatCount,
  formatCurrency,
  formatPercent,
  formatSignedPercent,
} from './format';

// Intl inserts a narrow no-break space in some groupings; normalise whitespace
// so the assertions describe the digits rather than the separator bytes.
const normalise = (value: string) => value.replace(/ | /g, ' ');

describe('formatCurrency', () => {
  it('renders minor units as pounds with two decimals', () => {
    expect(normalise(formatCurrency(0))).toBe('£0.00');
    expect(normalise(formatCurrency(1))).toBe('£0.01');
    expect(normalise(formatCurrency(1099))).toBe('£10.99');
    expect(normalise(formatCurrency(123_456_789))).toBe('£1,234,567.89');
  });
});

describe('formatCompactCurrency', () => {
  it.each([
    [0, '£0'],
    [50, '£1'],
    [12_500, '£125'],
    [99_999, '£1000'],
    [100_000, '£1K'],
    [120_000, '£1.2K'],
    [1_250_000, '£13K'],
    [950_000, '£9.5K'],
    [12_000_000, '£120K'],
    [50_000_000, '£500K'],
    [100_000_000, '£1M'],
    [123_456_789, '£1.2M'],
    [100_000_000_000, '£1B'],
  ])('formats %d minor units as %s', (minor, expected) => {
    expect(formatCompactCurrency(minor)).toBe(expected);
  });

  it('keeps the sign on negative amounts', () => {
    expect(formatCompactCurrency(-120_000)).toBe('-£1.2K');
  });

  // Intl's own compact notation swings between "£500" and "£0.5K" depending
  // on the host's ICU version, which is why this is hand-rolled.
  it('does not depend on the host ICU version', () => {
    expect(formatCompactCurrency(50_000)).toBe('£500');
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(normalise(formatCount(50_000))).toBe('50,000');
    expect(normalise(formatCount(7))).toBe('7');
  });
});

describe('formatPercent', () => {
  it('takes a ratio rather than a percentage', () => {
    expect(normalise(formatPercent(0.375))).toBe('37.5%');
    expect(normalise(formatPercent(0))).toBe('0%');
    expect(normalise(formatPercent(1))).toBe('100%');
  });

  it('renders an em dash for non-finite input', () => {
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatSignedPercent', () => {
  it('prefixes gains with a plus and leaves the minus on losses', () => {
    expect(normalise(formatSignedPercent(0.12))).toBe('+12%');
    expect(normalise(formatSignedPercent(-0.08))).toBe('-8%');
  });
});
