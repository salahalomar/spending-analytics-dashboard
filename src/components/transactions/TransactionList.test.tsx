import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransaction } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { initialState as filtersInitialState } from '@/features/filters/filtersSlice';
import type { Transaction } from '@/types/transaction';
import { ROW_HEIGHT, TransactionList } from './TransactionList';

/** A dataset large enough that rendering all of it would be obvious. */
function makeLargeDataset(count: number): Transaction[] {
  const dayMs = 86_400_000;
  const base = Date.parse('2025-06-30T12:00:00.000Z');

  return Array.from({ length: count }, (_, index) =>
    makeTransaction({
      id: `txn_${index}`,
      counterparty: index % 2 === 0 ? 'Tesco' : 'Uber',
      category: index % 2 === 0 ? 'Groceries' : 'Transport',
      amountMinor: 1000 + index,
      date: new Date(base - index * dayMs * 0.02).toISOString(),
    }),
  );
}

function renderList(items: Transaction[], filters = {}) {
  return renderWithStore(<TransactionList />, {
    preloadedState: {
      transactions: { ...transactionsInitialState, sample: items, status: 'succeeded' },
      filters: { ...filtersInitialState, dateFrom: '', dateTo: '', ...filters },
    },
  });
}

// jest.setup.ts pins clientHeight to 600, so the window is 600 / 56 rows plus
// one partial row plus the overscan.
const EXPECTED_WINDOW = Math.ceil(600 / ROW_HEIGHT) + 1 + 8;

describe('TransactionList', () => {
  it('reports the full row count while rendering only a window of them', () => {
    renderList(makeLargeDataset(5000));

    expect(screen.getByTestId('rendered-count')).toHaveTextContent('5,000 rows');

    const rows = screen.getAllByTestId('transaction-row');
    expect(rows).toHaveLength(EXPECTED_WINDOW);
    expect(rows.length).toBeLessThan(30);
  });

  it('sizes the scroll canvas for the whole list so the scrollbar is honest', () => {
    renderList(makeLargeDataset(5000));

    const canvas = screen.getByRole('list', { name: /5,000 transactions/i });
    expect(canvas).toHaveStyle({ height: `${5000 * ROW_HEIGHT}px` });
  });

  it('renders the rows that belong at the current scroll position', async () => {
    renderList(makeLargeDataset(5000));

    const viewport = screen.getByTestId('transaction-viewport');
    // jsdom has no layout, so scrollTop has to be stubbed for the element.
    Object.defineProperty(viewport, 'scrollTop', {
      value: 100 * ROW_HEIGHT,
      writable: true,
      configurable: true,
    });
    fireEvent.scroll(viewport);

    await waitFor(() => {
      expect(screen.getByTestId('rendered-count')).toBeInTheDocument();
      const ids = screen
        .getAllByTestId('transaction-row')
        .map((row) => row.getAttribute('data-transaction-id'));
      expect(ids).toContain('txn_100');
      expect(ids).not.toContain('txn_0');
    });
  });

  it('positions each row at its virtual offset', () => {
    renderList(makeLargeDataset(100));

    const firstRow = screen.getAllByTestId('transaction-row')[0]!;
    expect(firstRow.parentElement).toHaveStyle({ transform: 'translateY(0px)' });

    const secondRow = screen.getAllByTestId('transaction-row')[1]!;
    expect(secondRow.parentElement).toHaveStyle({ transform: `translateY(${ROW_HEIGHT}px)` });
  });

  it('exposes list semantics with the full set size, not the rendered count', () => {
    renderList(makeLargeDataset(5000));

    const firstRow = screen.getAllByTestId('transaction-row')[0]!.parentElement!;
    expect(firstRow).toHaveAttribute('aria-setsize', '5000');
    expect(firstRow).toHaveAttribute('aria-posinset', '1');
  });

  it('shows a skeleton until the dataset has loaded', () => {
    renderWithStore(<TransactionList />, {
      preloadedState: { transactions: { ...transactionsInitialState, status: 'loading' } },
    });

    expect(screen.getByTestId('skeleton-rows')).toBeInTheDocument();
    expect(screen.queryAllByTestId('transaction-row')).toHaveLength(0);
  });

  it('offers a way out when the filters match nothing', async () => {
    const user = userEvent.setup();
    const { store } = renderList(makeLargeDataset(50), { counterpartyQuery: 'no-such-merchant' });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(store.getState().filters.counterpartyQuery).toBe('');
  });

  it('opens the detail panel for the row that was clicked', async () => {
    const user = userEvent.setup();
    renderList(makeLargeDataset(50));

    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument();

    await user.click(screen.getAllByTestId('transaction-row')[0]!);

    const detail = screen.getByTestId('transaction-detail');
    expect(within(detail).getByText('txn_0')).toBeInTheDocument();
  });

  it('points each row at the panel it opens', async () => {
    const user = userEvent.setup();
    renderList(makeLargeDataset(50));

    const row = screen.getAllByTestId('transaction-row')[0]!;
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(row).toHaveAttribute('aria-controls');

    await user.click(row);
    expect(screen.getAllByTestId('transaction-row')[0]!).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('transaction-detail')).toHaveAttribute(
      'id',
      row.getAttribute('aria-controls'),
    );
  });

  it('returns focus to the row when the detail panel is dismissed', async () => {
    const user = userEvent.setup();
    renderList(makeLargeDataset(50));

    await user.click(screen.getAllByTestId('transaction-row')[0]!);
    await user.click(screen.getByTestId('close-detail'));

    // Without this the caret would drop back to the top of the document.
    expect(screen.getAllByTestId('transaction-row')[0]!).toHaveFocus();
  });

  it('closes the detail panel when the same row is clicked again', async () => {
    const user = userEvent.setup();
    renderList(makeLargeDataset(50));

    const row = screen.getAllByTestId('transaction-row')[0]!;
    await user.click(row);
    expect(screen.getByTestId('transaction-detail')).toBeInTheDocument();

    await user.click(screen.getAllByTestId('transaction-row')[0]!);
    expect(screen.queryByTestId('transaction-detail')).not.toBeInTheDocument();
  });

  it('re-sorts when a sort button is pressed, and flips direction on a second press', async () => {
    const user = userEvent.setup();
    const { store } = renderList(makeLargeDataset(50));

    await user.click(screen.getByTestId('sort-amount'));
    expect(store.getState().filters).toMatchObject({ sortField: 'amount', sortDirection: 'desc' });

    await user.click(screen.getByTestId('sort-amount'));
    expect(store.getState().filters).toMatchObject({ sortField: 'amount', sortDirection: 'asc' });

    const firstRow = screen.getAllByTestId('transaction-row')[0]!;
    expect(firstRow).toHaveTextContent('£10.00');
  });
});
