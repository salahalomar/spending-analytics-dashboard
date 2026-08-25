import type { Category } from '@/types/transaction';

/**
 * Maps a category to its CSS custom property. Colours live in `index.css` so
 * the chart, the legend and the row pills always agree.
 */
export function categoryColorVar(category: Category): string {
  return `var(--cat-${category.toLowerCase()})`;
}

const STATUS_COLOR_VARS: Record<string, string> = {
  completed: 'var(--positive)',
  pending: 'var(--warning)',
  reverted: 'var(--negative)',
};

export function statusColorVar(status: string): string {
  return STATUS_COLOR_VARS[status] ?? 'var(--text-muted)';
}
