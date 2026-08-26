import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransaction, makeTransactionSet } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { STRESS_TRANSACTION_COUNT } from '@/data/generateTransactions';
import { Header } from './Header';

function renderHeader(overrides = {}) {
  return {
    user: userEvent.setup(),
    ...renderWithStore(<Header />, {
      preloadedState: {
        transactions: {
          ...transactionsInitialState,
          sample: makeTransactionSet(),
          status: 'succeeded',
          generatedInMs: 12,
          ...overrides,
        },
      },
    }),
  };
}

describe('Header', () => {
  it('reports how much data is loaded and how long it took', () => {
    renderHeader();
    expect(screen.getByTestId('dataset-summary')).toHaveTextContent('6 transactions');
    expect(screen.getByTestId('dataset-summary')).toHaveTextContent('loaded in 12ms');
  });

  it('says it is loading before anything has arrived', () => {
    renderHeader({ sample: [], status: 'loading' });
    expect(screen.getByTestId('dataset-summary')).toHaveTextContent(/loading/i);
  });

  describe('sample data toggle', () => {
    it('switches to the user’s own records', async () => {
      const { user, store } = renderHeader();

      await user.click(screen.getByTestId('sample-toggle'));
      expect(store.getState().transactions.showSample).toBe(false);

      await user.click(screen.getByTestId('sample-toggle'));
      expect(store.getState().transactions.showSample).toBe(true);
    });

    it('prompts for a first entry when the sample is hidden and there is nothing else', () => {
      renderHeader({ showSample: false, sample: makeTransactionSet(), userEntered: [] });
      expect(screen.getByTestId('dataset-summary')).toHaveTextContent(/no records yet/i);
    });

    it('counts only your own records when the sample is hidden', () => {
      renderHeader({
        showSample: false,
        userEntered: [makeTransaction({ id: 'own', userEntered: true })],
      });
      expect(screen.getByTestId('dataset-summary')).toHaveTextContent('1 of your own records');
    });
  });

  describe('stress toggle', () => {
    it('loads the large dataset and back again', async () => {
      const { user, store } = renderHeader();

      await user.click(screen.getByTestId('stress-toggle'));
      await waitFor(
        () => expect(store.getState().transactions.sampleSize).toBe(STRESS_TRANSACTION_COUNT),
        { timeout: 20_000 },
      );
      expect(screen.getByTestId('stress-toggle')).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByTestId('stress-toggle'));
      await waitFor(() =>
        expect(store.getState().transactions.sampleSize).toBeLessThan(STRESS_TRANSACTION_COUNT),
      );
    }, 30_000);
  });

  it('switches theme and says which one it will switch to next', async () => {
    const { user, store } = renderHeader();
    const before = store.getState().ui.theme;

    await user.click(screen.getByTestId('theme-toggle'));
    expect(store.getState().ui.theme).not.toBe(before);
  });
});
