import { screen } from '@testing-library/react';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransactionSet } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { initialState as filtersInitialState } from '@/features/filters/filtersSlice';
import { SummaryCards } from './SummaryCards';

function renderCards(filters = {}) {
  return renderWithStore(<SummaryCards />, {
    preloadedState: {
      transactions: {
        ...transactionsInitialState,
        sample: makeTransactionSet(),
        status: 'succeeded',
      },
      filters: { ...filtersInitialState, ...filters },
    },
  });
}

const digits = (value: string | null) => (value ?? '').replace(/[^\d.,%+-]/g, '');

describe('SummaryCards', () => {
  it('shows the headline figures for the current selection', () => {
    renderCards();

    expect(digits(screen.getByTestId('summary-income').textContent)).toBe('2,500.00');
    expect(digits(screen.getByTestId('summary-expense').textContent)).toBe('280.99');
    expect(digits(screen.getByTestId('summary-net').textContent)).toBe('+2,219.01');
    expect(screen.getByTestId('summary-top-category')).toHaveTextContent('Groceries');
  });

  it('recalculates when a filter narrows the selection', () => {
    renderCards({ categories: ['Groceries'] });

    expect(digits(screen.getByTestId('summary-expense').textContent)).toBe('125.00');
    expect(digits(screen.getByTestId('summary-net').textContent)).toBe('-125.00');
  });

  it('shows a trend against the preceding period when one exists', () => {
    renderCards({ dateFrom: '2025-06-01', dateTo: '2025-06-30' });
    expect(screen.getByTestId('summary-trend')).toHaveTextContent('-12.8%');
  });

  it('says so when there is no comparable prior period', () => {
    renderCards({ dateFrom: '2025-04-01', dateTo: '2025-04-30' });

    expect(screen.queryByTestId('summary-trend')).not.toBeInTheDocument();
    expect(screen.getByText(/no comparable prior period/i)).toBeInTheDocument();
  });

  it('degrades gracefully when nothing matches', () => {
    renderCards({ counterpartyQuery: 'no-such-name' });

    expect(digits(screen.getByTestId('summary-expense').textContent)).toBe('0.00');
    expect(digits(screen.getByTestId('summary-income').textContent)).toBe('0.00');
    expect(screen.getByTestId('summary-top-category')).toHaveTextContent('—');
  });
});
