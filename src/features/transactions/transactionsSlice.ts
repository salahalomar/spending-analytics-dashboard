import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  generateTransactions,
  DEFAULT_TRANSACTION_COUNT,
  DEFAULT_SEED,
} from '@/data/generateTransactions';
import { createRecordStore, TRANSACTIONS_STORE } from '@/services/recordStore';
import { createId } from '@/utils/id';
import type { Transaction } from '@/types/transaction';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

const store = createRecordStore<Transaction>(TRANSACTIONS_STORE);

export interface TransactionsState {
  /** Generated sample rows. Regenerated each load, never persisted. */
  sample: Transaction[];
  /** Rows the user typed in. Persisted locally, newest first. */
  userEntered: Transaction[];
  status: LoadStatus;
  error: string | null;
  /** How long the last generation took, surfaced as a performance note. */
  generatedInMs: number | null;
  /** Whether the sample data is mixed in with the user's own records. */
  showSample: boolean;
  /** How many sample rows are currently loaded. */
  sampleSize: number;
}

export const initialState: TransactionsState = {
  sample: [],
  userEntered: [],
  status: 'idle',
  error: null,
  generatedInMs: null,
  showSample: true,
  sampleSize: DEFAULT_TRANSACTION_COUNT,
};

/** Fields the user supplies; everything else is derived. */
export interface TransactionDraft {
  date: string;
  direction: Transaction['direction'];
  counterparty: string;
  category: Transaction['category'];
  amountMinor: number;
  paymentMethod: Transaction['paymentMethod'];
  status: Transaction['status'];
  description: string;
}

export function draftToTransaction(draft: TransactionDraft, id = createId('txn')): Transaction {
  const timestamp = Date.parse(`${draft.date}T12:00:00.000Z`);

  return {
    id,
    date: new Date(timestamp).toISOString(),
    timestamp,
    direction: draft.direction,
    counterparty: draft.counterparty.trim(),
    category: draft.category,
    amountMinor: draft.amountMinor,
    currency: 'GBP',
    paymentMethod: draft.paymentMethod,
    status: draft.status,
    description: draft.description.trim(),
    userEntered: true,
  };
}

/** Keeps the user's rows newest-first, matching the generated ordering. */
function insertSorted(rows: Transaction[], row: Transaction): void {
  const index = rows.findIndex((candidate) => candidate.timestamp < row.timestamp);
  if (index === -1) {
    rows.push(row);
  } else {
    rows.splice(index, 0, row);
  }
}

export interface LoadArgs {
  count?: number;
  seed?: number;
}

/**
 * Builds the sample dataset and reads back anything the user has saved.
 *
 * Generation is deferred to a macrotask so React can paint the loading
 * skeleton first — building 50,000 objects inside the dispatch would block
 * the first paint.
 */
export const loadTransactions = createAsyncThunk<
  { sample: Transaction[]; userEntered: Transaction[]; generatedInMs: number; count: number },
  LoadArgs | undefined
>('transactions/load', async (args) => {
  const count = args?.count ?? DEFAULT_TRANSACTION_COUNT;
  const seed = args?.seed ?? DEFAULT_SEED;

  const startedAt = performance.now();
  const sample = await new Promise<Transaction[]>((resolve) => {
    setTimeout(() => resolve(generateTransactions({ count, seed })), 0);
  });
  const generatedInMs = Math.round(performance.now() - startedAt);

  const saved = await store.getAll();
  saved.sort((a, b) => b.timestamp - a.timestamp);

  return { sample, userEntered: saved, generatedInMs, count };
});

export const addTransaction = createAsyncThunk<Transaction, TransactionDraft>(
  'transactions/add',
  async (draft) => {
    const transaction = draftToTransaction(draft);
    await store.put(transaction);
    return transaction;
  },
);

export const updateTransaction = createAsyncThunk<Transaction, Transaction>(
  'transactions/update',
  async (transaction) => {
    await store.put(transaction);
    return transaction;
  },
);

export const deleteTransaction = createAsyncThunk<string, string>(
  'transactions/delete',
  async (id) => {
    await store.remove(id);
    return id;
  },
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    /** Used by tests and harnesses to inject a fixed sample dataset. */
    sampleReceived(state, action: PayloadAction<Transaction[]>) {
      state.sample = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
    userRecordsReceived(state, action: PayloadAction<Transaction[]>) {
      state.userEntered = action.payload.slice().sort((a, b) => b.timestamp - a.timestamp);
    },
    sampleDataToggled(state) {
      state.showSample = !state.showSample;
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
        state.sample = action.payload.sample;
        state.userEntered = action.payload.userEntered;
        state.generatedInMs = action.payload.generatedInMs;
        state.sampleSize = action.payload.count;
      })
      .addCase(loadTransactions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Could not load your transactions';
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        insertSorted(state.userEntered, action.payload);
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const index = state.userEntered.findIndex((row) => row.id === action.payload.id);
        if (index !== -1) {
          state.userEntered.splice(index, 1);
        }
        insertSorted(state.userEntered, action.payload);
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.userEntered = state.userEntered.filter((row) => row.id !== action.payload);
      });
  },
});

export const { sampleReceived, userRecordsReceived, sampleDataToggled } = transactionsSlice.actions;
export default transactionsSlice.reducer;
