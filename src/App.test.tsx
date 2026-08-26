import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { createStore } from '@/app/store';
import { loadTransactions } from '@/features/transactions/transactionsSlice';
import { loadObligations } from '@/features/ledger/ledgerSlice';
import { App } from './App';

/**
 * Integration coverage: a real store, the real reducers, the real selectors
 * and a real router, driven through the UI the way a user would.
 */
describe('App', () => {
  /** Builds the datasets once, outside the component, to keep tests quick. */
  async function renderLoaded(route = '/') {
    const store = createStore();
    await store.dispatch(loadTransactions({ count: 4000, seed: 11 }));
    await store.dispatch(loadObligations());
    return { user: userEvent.setup(), ...renderWithStore(<App />, { store, route }) };
  }

  it('lands on the overview and shows the whole position', async () => {
    await renderLoaded();

    expect(screen.getByTestId('overview-page')).toBeInTheDocument();
    expect(screen.getByTestId('overview-income')).toBeInTheDocument();
    expect(screen.getByTestId('overview-expense')).toBeInTheDocument();
    expect(screen.getByTestId('overview-net')).toBeInTheDocument();
    expect(screen.getByTestId('overview-owed-to-you')).toBeInTheDocument();
    expect(screen.getByTestId('overview-you-owe')).toBeInTheDocument();
  });

  it('shows a loading state before the data arrives', () => {
    renderWithStore(<App />, { route: '/transactions' });
    expect(screen.getByTestId('skeleton-rows')).toBeInTheDocument();
  });

  describe('navigation', () => {
    it('moves between the four sections', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByTestId('nav-transactions'));
      expect(await screen.findByTestId('transactions-page')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-owed-to-me'));
      expect(await screen.findByTestId('ledger-page-receivable')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-i-owe'));
      expect(await screen.findByTestId('ledger-page-payable')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-overview'));
      expect(await screen.findByTestId('overview-page')).toBeInTheDocument();
    });

    it('sends an unknown path back to the overview', async () => {
      await renderLoaded('/nonsense');
      expect(screen.getByTestId('overview-page')).toBeInTheDocument();
    });

    it('shows the filter sidebar only where filters apply', async () => {
      const { user } = await renderLoaded();
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-i-owe'));
      await screen.findByTestId('ledger-page-payable');
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('narrows the list to one category', async () => {
      const { user } = await renderLoaded('/transactions');

      await user.click(screen.getByTestId('category-chip-Groceries'));

      await waitFor(() => {
        for (const row of screen.getAllByTestId('transaction-row')) {
          expect(row).toHaveTextContent('Groceries');
        }
      });
    });

    it('carries the filter across to the overview charts', async () => {
      const { user } = await renderLoaded('/transactions');

      await user.click(screen.getByTestId('category-chip-Groceries'));
      await user.click(screen.getByTestId('nav-overview'));

      const chart = await screen.findByTestId('category-bar-chart');
      expect(within(chart).getAllByRole('listitem')).toHaveLength(1);
    });

    it('switches the whole dashboard to money in', async () => {
      const { user, store } = await renderLoaded('/transactions');

      await user.click(screen.getByTestId('direction-income'));
      expect(store.getState().filters.direction).toBe('income');

      await waitFor(() => {
        for (const row of screen.getAllByTestId('transaction-row')) {
          expect(row).toHaveAttribute('data-direction', 'income');
        }
      });
    });

    it('combines a category filter with a search', async () => {
      const { user, store } = await renderLoaded('/transactions');

      await user.click(screen.getByTestId('category-chip-Groceries'));
      await user.type(screen.getByTestId('counterparty-search'), 'tesco');

      await waitFor(() => expect(store.getState().filters.counterpartyQuery).toBe('tesco'));
      await waitFor(() => {
        for (const row of screen.getAllByTestId('transaction-row')) {
          expect(row).toHaveTextContent('Tesco');
        }
      });
    });

    it('restores the full dataset when the filters are reset', async () => {
      const { user, store } = await renderLoaded('/transactions');
      const total = store.getState().transactions.sample.length;
      const expected = `${total.toLocaleString('en-GB')} rows`;

      await user.click(screen.getByTestId('category-chip-Travel'));
      await waitFor(() =>
        expect(screen.getByTestId('rendered-count')).not.toHaveTextContent(expected),
      );

      await user.click(screen.getByTestId('reset-filters'));
      await waitFor(() => expect(screen.getByTestId('rendered-count')).toHaveTextContent(expected));
    });
  });

  it('adds a transaction the user types in and shows it in the list', async () => {
    const { user, store } = await renderLoaded('/transactions');

    await user.type(screen.getByTestId('quick-add-counterparty'), 'Corner Shop');
    await user.type(screen.getByTestId('quick-add-amount'), '12.34');
    await user.click(screen.getByTestId('quick-add-submit'));

    await waitFor(() => expect(store.getState().transactions.userEntered).toHaveLength(1));
    expect(store.getState().transactions.userEntered[0]).toMatchObject({
      counterparty: 'Corner Shop',
      amountMinor: 1234,
      direction: 'expense',
      userEntered: true,
    });
  });

  it('switches theme and reflects it on the document', async () => {
    const { user } = await renderLoaded();

    const initial = document.documentElement.getAttribute('data-theme');
    await user.click(screen.getByTestId('theme-toggle'));

    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).not.toBe(initial),
    );
  });

  it('offers a retry when the data cannot be loaded', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />, {
      preloadedState: {
        transactions: {
          sample: [],
          userEntered: [],
          showSample: true,
          sampleSize: 0,
          status: 'failed',
          error: 'generator exploded',
          generatedInMs: null,
        },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('generator exploded');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument(), {
      timeout: 15_000,
    });
  }, 20_000);
});
