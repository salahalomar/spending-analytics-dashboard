import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransactionSet } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { initialState as filtersInitialState } from '@/features/filters/filtersSlice';
import { CategoryBarChart } from './CategoryBarChart';

function renderChart(filters = {}) {
  return renderWithStore(<CategoryBarChart />, {
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

describe('CategoryBarChart', () => {
  it('lists the categories present in the selection, largest first', () => {
    renderChart();

    const rows = screen.getByTestId('category-bar-chart').querySelectorAll('li');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Groceries');
    expect(rows[0]).toHaveTextContent('£125.00');
  });

  it('scales the largest bar to full width and the rest against it', () => {
    renderChart();

    const groceries = screen.getByTestId('category-bar-Groceries').firstElementChild!;
    const transport = screen.getByTestId('category-bar-Transport').firstElementChild!;

    expect(groceries).toHaveStyle({ width: '100%' });
    // Transport is 2500 of the 12500 Groceries total.
    expect(transport).toHaveStyle({ width: '20%' });
  });

  it('describes each bar for screen readers', () => {
    renderChart();

    expect(screen.getByTestId('category-bar-Groceries')).toHaveAccessibleName(
      /Groceries: £125\.00 across 2 transactions/i,
    );
  });

  it('doubles as a filter control', async () => {
    const user = userEvent.setup();
    const { store } = renderChart();

    await user.click(screen.getByTestId('category-bar-Groceries'));
    expect(store.getState().filters.categories).toEqual(['Groceries']);
  });

  it('says so when the selection is empty', () => {
    renderChart({ counterpartyQuery: 'no-such-merchant' });
    expect(screen.getByText(/no spend in this selection/i)).toBeInTheDocument();
  });
});
