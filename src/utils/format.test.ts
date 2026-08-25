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
  it('abbreviates large amounts', () => {
    expect(normalise(formatCompactCurrency(120_000))).toBe('£1.2K');
    expect(normalise(formatCompactCurrency(500_000_00))).toBe('£500K');
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
