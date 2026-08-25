import { createStore } from '@/app/store';
import { makeTransactionSet } from '@/test/fixtures';
import reducer, {
  initialState,
  loadTransactions,
  transactionsReceived,
} from './transactionsSlice';

describe('transactionsSlice', () => {
  it('starts empty and idle', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('accepts an injected dataset', () => {
    const items = makeTransactionSet();
    const state = reducer(initialState, transactionsReceived(items));
    expect(state.items).toEqual(items);
    expect(state.status).toBe('succeeded');
  });

  describe('loadTransactions', () => {
    it('reports loading while the dataset is being built', () => {
      const state = reducer(initialState, loadTransactions.pending('req', undefined));
      expect(state.status).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('stores the dataset and the generation time on success', () => {
      const items = makeTransactionSet();
      const state = reducer(
        initialState,
        loadTransactions.fulfilled({ items, generatedInMs: 42 }, 'req', undefined),
      );
      expect(state.status).toBe('succeeded');
      expect(state.items).toHaveLength(items.length);
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

    it('clears a previous error when a retry starts', () => {
      const failed = reducer(
        initialState,
        loadTransactions.rejected(new Error('nope'), 'req', undefined),
      );
      expect(reducer(failed, loadTransactions.pending('req2', undefined)).error).toBeNull();
    });

    it('runs end to end through the real store', async () => {
      const store = createStore();
      await store.dispatch(loadTransactions({ count: 500, seed: 3 }));

      const state = store.getState().transactions;
      expect(state.status).toBe('succeeded');
      expect(state.items).toHaveLength(500);
      expect(state.generatedInMs).toBeGreaterThanOrEqual(0);
    });
  });
});
