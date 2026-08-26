import { CATEGORIES } from '@/types/transaction';
import { categoryColorVar, categorySlug, statusColorVar } from './categoryColor';

describe('categorySlug', () => {
  it('lower-cases and joins words with a hyphen', () => {
    expect(categorySlug('Groceries')).toBe('groceries');
    expect(categorySlug('Eating Out')).toBe('eating-out');
  });

  it('collapses ampersands and punctuation rather than emitting them', () => {
    expect(categorySlug('Rent & Mortgage')).toBe('rent-mortgage');
    expect(categorySlug('Interest & Dividends')).toBe('interest-dividends');
  });

  it('never leaves a leading or trailing hyphen', () => {
    expect(categorySlug('  & Spaced &  ')).toBe('spaced');
  });
});

describe('categoryColorVar', () => {
  it('produces a valid custom-property reference for every category', () => {
    // A space or ampersand in the property name makes the whole declaration
    // invalid, and the browser drops it silently.
    for (const category of CATEGORIES) {
      expect(categoryColorVar(category)).toMatch(
        /^var\(--cat-[a-z0-9-]+, var\(--cat-fallback\)\)$/,
      );
    }
  });

  it('falls back rather than resolving to nothing', () => {
    expect(categoryColorVar('Groceries')).toContain('var(--cat-fallback)');
  });
});

describe('statusColorVar', () => {
  it('maps the known statuses', () => {
    expect(statusColorVar('completed')).toBe('var(--positive)');
    expect(statusColorVar('pending')).toBe('var(--warning)');
    expect(statusColorVar('reverted')).toBe('var(--negative)');
  });

  it('falls back for anything unexpected', () => {
    expect(statusColorVar('nonsense')).toBe('var(--text-muted)');
  });
});
