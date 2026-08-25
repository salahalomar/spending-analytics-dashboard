import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { createStore } from '@/app/store';
import { loadTransactions } from '@/features/transactions/transactionsSlice';
import { App } from './App';

/**
 * Integration coverage: a real store, the real reducers and the real
 * selectors, driven through the UI the way a user would.
 */
describe('App', () => {
  it('shows a loading state, then the dashboard', async () => {
    renderWithStore(<App />);

    expect(screen.getByTestId('skeleton-rows')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByTestId('rendered-count')).toHaveTextContent('50,000 rows'),
      { timeout: 15_000 },
    );
    expect(screen.queryByTestId('skeleton-rows')).not.toBeInTheDocument();
  }, 20_000);

  describe('once the dataset is loaded', () => {
    async function renderLoaded() {
      // Build the dataset once, outside the component, to keep each test quick.
      const store = createStore();
      await store.dispatch(loadTransactions({ count: 4000, seed: 11 }));
      return { user: userEvent.setup(), ...renderWithStore(<App />, { store }) };
    }

    it('renders the whole dashboard', async () => {
      await renderLoaded();

      expect(screen.getByRole('heading', { name: 'Spending Analytics' })).toBeInTheDocument();
      expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
      expect(screen.getByTestId('chart-monthly')).toBeInTheDocument();
      expect(screen.getByTestId('chart-category')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    });

    it('narrows the summary, the charts and the list from one filter', async () => {
      const { user, store } = await renderLoaded();

      const before = Number(store.getState().transactions.items.length);
      expect(screen.getByTestId('result-count')).toHaveTextContent(`of ${before.toLocaleString('en-GB')}`);

      await user.click(screen.getByTestId('category-chip-Groceries'));

      await waitFor(() => {
        const rows = screen.getAllByTestId('transaction-row');
        for (const row of rows) {
          expect(row).toHaveTextContent('Groceries');
        }
      });

      const chart = screen.getByTestId('category-bar-chart');
      expect(within(chart).getAllByRole('listitem')).toHaveLength(1);
    });

    it('combines a category filter with a merchant search', async () => {
      const { user, store } = await renderLoaded();

      await user.click(screen.getByTestId('category-chip-Groceries'));
      await user.type(screen.getByTestId('merchant-search'), 'tesco');

      await waitFor(() => expect(store.getState().filters.merchantQuery).toBe('tesco'));
      await waitFor(() => {
        for (const row of screen.getAllByTestId('transaction-row')) {
          expect(row).toHaveTextContent('Tesco');
        }
      });
    });

    it('restores the full dataset when the filters are reset', async () => {
      const { user, store } = await renderLoaded();
      const total = store.getState().transactions.items.length;

      await user.click(screen.getByTestId('category-chip-Travel'));
      await waitFor(() =>
        expect(screen.getByTestId('rendered-count')).not.toHaveTextContent(
          `${total.toLocaleString('en-GB')} rows`,
        ),
      );

      await user.click(screen.getByTestId('reset-filters'));
      await waitFor(() =>
        expect(screen.getByTestId('rendered-count')).toHaveTextContent(
          `${total.toLocaleString('en-GB')} rows`,
        ),
      );
    });

    it('switches theme and reflects it on the document', async () => {
      const { user } = await renderLoaded();

      const initial = document.documentElement.getAttribute('data-theme');
      await user.click(screen.getByTestId('theme-toggle'));

      await waitFor(() =>
        expect(document.documentElement.getAttribute('data-theme')).not.toBe(initial),
      );
    });
  });

  it('offers a retry when the dataset cannot be built', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />, {
      preloadedState: {
        transactions: {
          items: [],
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
