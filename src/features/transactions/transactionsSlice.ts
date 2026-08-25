import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { generateTransactions, DEFAULT_TRANSACTION_COUNT, DEFAULT_SEED } from '@/data/generateTransactions';
import type { Transaction } from '@/types/transaction';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface TransactionsState {
  items: Transaction[];
  status: LoadStatus;
  error: string | null;
  /** How long the last generation took, surfaced in the header as a perf note. */
  generatedInMs: number | null;
}

export const initialState: TransactionsState = {
  items: [],
  status: 'idle',
  error: null,
  generatedInMs: null,
};

export interface LoadTransactionsArgs {
  count?: number;
  seed?: number;
}

/**
 * Stands in for the API call a real dashboard would make. Generation is
 * deferred to a macrotask so React can paint the loading skeleton first —
 * building 50,000 objects synchronously inside the dispatch would block the
 * first paint.
 */
export const loadTransactions = createAsyncThunk<
  { items: Transaction[]; generatedInMs: number },
  LoadTransactionsArgs | undefined
>('transactions/load', async (args) => {
  const count = args?.count ?? DEFAULT_TRANSACTION_COUNT;
  const seed = args?.seed ?? DEFAULT_SEED;

  const startedAt = performance.now();
  const items = await new Promise<Transaction[]>((resolve) => {
    setTimeout(() => resolve(generateTransactions({ count, seed })), 0);
  });

  return { items, generatedInMs: Math.round(performance.now() - startedAt) };
});

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    /** Used by tests and Storybook-style harnesses to inject a fixed dataset. */
    transactionsReceived(state, action: PayloadAction<Transaction[]>) {
      state.items = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
    transactionsCleared(state) {
      state.items = [];
      state.status = 'idle';
      state.error = null;
      state.generatedInMs = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransactions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadTransactions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.generatedInMs = action.payload.generatedInMs;
      })
      .addCase(loadTransactions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load transactions';
      });
  },
});

export const { transactionsReceived, transactionsCleared } = transactionsSlice.actions;
export default transactionsSlice.reducer;
