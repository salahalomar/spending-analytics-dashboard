import { createStore } from '@/app/store';
import { makeTransaction, makeTransactionSet } from '@/test/fixtures';
import reducer, {
  addTransaction,
  deleteTransaction,
  draftToTransaction,
  initialState,
  loadTransactions,
  sampleDataToggled,
  sampleReceived,
  updateTransaction,
  userRecordsReceived,
  type TransactionDraft,
} from './transactionsSlice';

const DRAFT: TransactionDraft = {
  date: '2025-06-20',
  direction: 'expense',
  counterparty: '  Tesco  ',
  category: 'Groceries',
  amountMinor: 4250,
  paymentMethod: 'Card',
  status: 'completed',
  description: '  Weekly shop  ',
};

describe('draftToTransaction', () => {
  it('fills in the derived fields and trims free text', () => {
    const transaction = draftToTransaction(DRAFT, 'txn_fixed');

    expect(transaction).toMatchObject({
      id: 'txn_fixed',
      counterparty: 'Tesco',
      description: 'Weekly shop',
      amountMinor: 4250,
      currency: 'GBP',
      userEntered: true,
    });
  });

  it('anchors the entry to midday so a timezone cannot shift the date', () => {
    const transaction = draftToTransaction(DRAFT, 'txn_fixed');
    expect(transaction.date).toBe('2025-06-20T12:00:00.000Z');
    expect(transaction.timestamp).toBe(Date.parse('2025-06-20T12:00:00.000Z'));
  });
});

describe('transactionsSlice', () => {
  it('starts empty and idle', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('accepts an injected sample dataset', () => {
    const items = makeTransactionSet();
    const state = reducer(initialState, sampleReceived(items));
    expect(state.sample).toEqual(items);
    expect(state.status).toBe('succeeded');
  });

  it('keeps the user records newest first however they arrive', () => {
    const state = reducer(
      initialState,
      userRecordsReceived([
        makeTransaction({ id: 'older', date: '2025-01-01T10:00:00.000Z' }),
        makeTransaction({ id: 'newer', date: '2025-06-01T10:00:00.000Z' }),
      ]),
    );
    expect(state.userEntered.map((row) => row.id)).toEqual(['newer', 'older']);
  });

  it('toggles the sample data on and off', () => {
    const hidden = reducer(initialState, sampleDataToggled());
    expect(hidden.showSample).toBe(false);
    expect(reducer(hidden, sampleDataToggled()).showSample).toBe(true);
  });

  describe('loadTransactions', () => {
    it('reports loading while the dataset is being built', () => {
      const state = reducer(initialState, loadTransactions.pending('req', undefined));
      expect(state.status).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('stores both datasets and the generation time on success', () => {
      const sample = makeTransactionSet();
      const state = reducer(
        initialState,
        loadTransactions.fulfilled(
          { sample, userEntered: [], generatedInMs: 42, count: sample.length },
          'req',
          undefined,
        ),
      );
      expect(state.status).toBe('succeeded');
      expect(state.sample).toHaveLength(sample.length);
      expect(state.generatedInMs).toBe(42);
    });

    it('surfaces the error message on failure', () => {
      const state = reducer(
        initialState,
        loadTransactions.rejected(new Error('generator exploded'), 'req', undefined),
      );
      expect(state.status).toBe('failed');
      expect(state.error).toBe('generator exploded');
    });

    it('runs end to end through the real store', async () => {
      const store = createStore();
      await store.dispatch(loadTransactions({ count: 500, seed: 3 }));

      const state = store.getState().transactions;
      expect(state.status).toBe('succeeded');
      expect(state.sample).toHaveLength(500);
      expect(state.generatedInMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('user records', () => {
    it('inserts a new entry in date order', () => {
      const seeded = reducer(
        initialState,
        userRecordsReceived([
          makeTransaction({ id: 'newest', date: '2025-09-01T10:00:00.000Z' }),
          makeTransaction({ id: 'oldest', date: '2025-01-01T10:00:00.000Z' }),
        ]),
      );

      const middle = makeTransaction({ id: 'middle', date: '2025-05-01T10:00:00.000Z' });
      const state = reducer(seeded, addTransaction.fulfilled(middle, 'req', DRAFT));

      expect(state.userEntered.map((row) => row.id)).toEqual(['newest', 'middle', 'oldest']);
    });

    it('re-sorts when an edit moves a row to a different date', () => {
      const first = makeTransaction({ id: 'first', date: '2025-06-01T10:00:00.000Z' });
      const second = makeTransaction({ id: 'second', date: '2025-05-01T10:00:00.000Z' });
      const seeded = reducer(initialState, userRecordsReceived([first, second]));

      const moved = {
        ...first,
        date: '2025-01-01T10:00:00.000Z',
        timestamp: Date.parse('2025-01-01T10:00:00.000Z'),
      };
      const state = reducer(seeded, updateTransaction.fulfilled(moved, 'req', moved));

      expect(state.userEntered.map((row) => row.id)).toEqual(['second', 'first']);
    });

    it('removes an entry', () => {
      const seeded = reducer(
        initialState,
        userRecordsReceived([makeTransaction({ id: 'keep' }), makeTransaction({ id: 'drop' })]),
      );
      const state = reducer(seeded, deleteTransaction.fulfilled('drop', 'req', 'drop'));
      expect(state.userEntered.map((row) => row.id)).toEqual(['keep']);
    });

    it('persists and reads back through the real store', async () => {
      const store = createStore();
      await store.dispatch(addTransaction(DRAFT));

      const saved = store.getState().transactions.userEntered;
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        counterparty: 'Tesco',
        amountMinor: 4250,
        userEntered: true,
      });
    });
  });
});
