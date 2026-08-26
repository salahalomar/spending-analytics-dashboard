import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { getDatasetDateRange } from '@/data/generateTransactions';
import { shiftDateInput } from '@/utils/date';
import { makeTransactionSet } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { FilterPanel } from './FilterPanel';

function renderPanel() {
  return renderWithStore(<FilterPanel />, {
    preloadedState: {
      transactions: {
        ...transactionsInitialState,
        sample: makeTransactionSet(),
        status: 'succeeded',
      },
    },
  });
}

describe('FilterPanel', () => {
  describe('counterparty search', () => {
    it('keeps typing local until the debounce elapses', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { store } = renderPanel();

      await user.type(screen.getByTestId('counterparty-search'), 'tesco');

      // Every keystroke is on screen, but the store has not been touched yet.
      expect(screen.getByTestId('counterparty-search')).toHaveValue('tesco');
      expect(store.getState().filters.counterpartyQuery).toBe('');

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(store.getState().filters.counterpartyQuery).toBe('tesco');

      jest.useRealTimers();
    });

    it('dispatches once for a burst of keystrokes', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { store } = renderPanel();
      const dispatch = jest.spyOn(store, 'dispatch');

      await user.type(screen.getByTestId('counterparty-search'), 'tesco');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const searchDispatches = dispatch.mock.calls.filter(
        ([action]) =>
          typeof action === 'object' &&
          action !== null &&
          'type' in action &&
          action.type === 'filters/counterpartyQueryChanged',
      );
      expect(searchDispatches).toHaveLength(1);

      jest.useRealTimers();
    });

    it('clears the box and the store together', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      await user.type(screen.getByTestId('counterparty-search'), 'tesco');
      await waitFor(() => expect(store.getState().filters.counterpartyQuery).toBe('tesco'));

      await user.click(screen.getByTestId('clear-search'));
      expect(screen.getByTestId('counterparty-search')).toHaveValue('');
      await waitFor(() => expect(store.getState().filters.counterpartyQuery).toBe(''));
    });

    it('picks up an external reset', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      await user.type(screen.getByTestId('counterparty-search'), 'tesco');
      await waitFor(() => expect(store.getState().filters.counterpartyQuery).toBe('tesco'));

      await user.click(screen.getByTestId('reset-filters'));
      await waitFor(() => expect(screen.getByTestId('counterparty-search')).toHaveValue(''));
    });
  });

  describe('categories', () => {
    it('toggles a category on and off', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();
      const chip = screen.getByTestId('category-chip-Groceries');

      await user.click(chip);
      expect(store.getState().filters.categories).toEqual(['Groceries']);
      expect(chip).toHaveAttribute('aria-pressed', 'true');

      await user.click(chip);
      expect(store.getState().filters.categories).toEqual([]);
      expect(chip).toHaveAttribute('aria-pressed', 'false');
    });

    it('selects several categories at once', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      await user.click(screen.getByTestId('category-chip-Groceries'));
      await user.click(screen.getByTestId('category-chip-Travel'));
      expect(store.getState().filters.categories).toEqual(['Groceries', 'Travel']);
    });

    it('clears every category with the All button', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      await user.click(screen.getByTestId('category-chip-Groceries'));
      await user.click(screen.getByTestId('clear-categories'));
      expect(store.getState().filters.categories).toEqual([]);
    });
  });

  describe('statuses', () => {
    it('toggles a status on and off', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();
      const chip = screen.getByTestId('status-chip-pending');

      await user.click(chip);
      expect(store.getState().filters.statuses).toEqual(['pending']);
      expect(chip).toHaveAttribute('aria-pressed', 'true');

      await user.click(chip);
      expect(store.getState().filters.statuses).toEqual([]);
    });

    it('narrows the list to the selected status', async () => {
      const user = userEvent.setup();
      renderPanel();

      // The fixture set has a single pending transaction.
      await user.click(screen.getByTestId('status-chip-pending'));
      await waitFor(() =>
        expect(screen.getByTestId('result-count')).toHaveTextContent('1 of 6 transactions'),
      );
    });
  });

  describe('date range', () => {
    it('applies a preset', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      const range = getDatasetDateRange();
      await user.click(screen.getByTestId('date-preset-30d'));
      expect(store.getState().filters).toMatchObject({
        dateFrom: shiftDateInput(range.end, -30),
        dateTo: range.end,
      });
    });

    it('accepts a typed range at both ends', async () => {
      const user = userEvent.setup();
      const { store } = renderPanel();

      await user.clear(screen.getByTestId('date-from'));
      await user.type(screen.getByTestId('date-from'), '2025-03-01');
      expect(store.getState().filters.dateFrom).toBe('2025-03-01');

      await user.clear(screen.getByTestId('date-to'));
      await user.type(screen.getByTestId('date-to'), '2025-09-30');
      expect(store.getState().filters.dateTo).toBe('2025-09-30');
    });
  });

  it('filters by an amount range', async () => {
    const user = userEvent.setup();
    const { store } = renderPanel();

    await user.type(screen.getByTestId('min-amount'), '25');
    await user.type(screen.getByTestId('max-amount'), '80');

    expect(store.getState().filters).toMatchObject({ minAmount: '25', maxAmount: '80' });
  });

  it('reports how much of the dataset is showing', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByTestId('result-count')).toHaveTextContent('6 of 6 transactions');

    await user.click(screen.getByTestId('category-chip-Groceries'));
    await waitFor(() =>
      expect(screen.getByTestId('result-count')).toHaveTextContent('2 of 6 transactions'),
    );
  });
});
