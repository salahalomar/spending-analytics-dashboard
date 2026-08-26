import type { Category } from '@/types/transaction';

/**
 * Maps a category to its CSS custom property.
 *
 * The name is slugified first: category labels contain spaces and ampersands
 * ("Rent & Mortgage"), and interpolating those straight into a property name
 * produces `var(--cat-rent & mortgage)`, which is not a valid identifier. The
 * browser silently ignores it, so the bar and its dot render with no colour at
 * all — which is exactly what happened.
 */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categoryColorVar(category: Category): string {
  return `var(--cat-${categorySlug(category)}, var(--cat-fallback))`;
}

const STATUS_COLOR_VARS: Record<string, string> = {
  completed: 'var(--positive)',
  pending: 'var(--warning)',
  reverted: 'var(--negative)',
};

export function statusColorVar(status: string): string {
  return STATUS_COLOR_VARS[status] ?? 'var(--text-muted)';
}
