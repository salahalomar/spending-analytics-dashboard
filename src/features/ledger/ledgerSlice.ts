import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { generateObligations } from '@/data/generateObligations';
import { createRecordStore, OBLIGATIONS_STORE } from '@/services/recordStore';
import { createId } from '@/utils/id';
import type { Obligation, ObligationDirection, ObligationKind } from '@/types/ledger';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

const store = createRecordStore<Obligation>(OBLIGATIONS_STORE);

export interface LedgerState {
  sample: Obligation[];
  userEntered: Obligation[];
  status: LoadStatus;
  error: string | null;
}

export const initialState: LedgerState = {
  sample: [],
  userEntered: [],
  status: 'idle',
  error: null,
};

/** Fields the user supplies when recording a debt. */
export interface ObligationDraft {
  direction: ObligationDirection;
  counterparty: string;
  kind: ObligationKind;
  reference: string;
  amountMinor: number;
  amountPaidMinor: number;
  issuedOn: string;
  dueOn: string;
  notes: string;
}

export function draftToObligation(draft: ObligationDraft, id = createId('obl')): Obligation {
  return {
    id,
    direction: draft.direction,
    counterparty: draft.counterparty.trim(),
    kind: draft.kind,
    reference: draft.reference.trim(),
    amountMinor: draft.amountMinor,
    amountPaidMinor: Math.min(draft.amountPaidMinor, draft.amountMinor),
    currency: 'GBP',
    issuedOn: draft.issuedOn,
    dueOn: draft.dueOn,
    state: draft.amountPaidMinor >= draft.amountMinor ? 'settled' : 'outstanding',
    notes: draft.notes.trim(),
    userEntered: true,
  };
}

export const loadObligations = createAsyncThunk<
  { sample: Obligation[]; userEntered: Obligation[] },
  void
>('ledger/load', async () => {
  const saved = await store.getAll();
  return { sample: generateObligations(), userEntered: saved };
});

export const addObligation = createAsyncThunk<Obligation, ObligationDraft>(
  'ledger/add',
  async (draft) => {
    const obligation = draftToObligation(draft);
    await store.put(obligation);
    return obligation;
  },
);

export const deleteObligation = createAsyncThunk<string, string>('ledger/delete', async (id) => {
  await store.remove(id);
  return id;
});

/**
 * Records a payment against a debt.
 *
 * Sample rows are editable in memory but never written to storage — the
 * dataset is regenerated on each load, so persisting a change to one would
 * leave an orphaned record that nothing reads.
 */
export const settleObligation = createAsyncThunk<
  Obligation,
  { id: string; amountMinor: number },
  { state: { ledger: LedgerState } }
>('ledger/settle', async ({ id, amountMinor }, { getState }) => {
  const { sample, userEntered } = getState().ledger;
  const existing = [...userEntered, ...sample].find((candidate) => candidate.id === id);
  if (!existing) throw new Error('That record no longer exists');

  const amountPaidMinor = Math.min(existing.amountMinor, existing.amountPaidMinor + amountMinor);
  const updated: Obligation = {
    ...existing,
    amountPaidMinor,
    state: amountPaidMinor >= existing.amountMinor ? 'settled' : existing.state,
  };

  if (updated.userEntered) {
    await store.put(updated);
  }

  return updated;
});

function replaceIn(rows: Obligation[], updated: Obligation): boolean {
  const index = rows.findIndex((row) => row.id === updated.id);
  if (index === -1) return false;
  rows[index] = updated;
  return true;
}

const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    sampleReceived(state, action: PayloadAction<Obligation[]>) {
      state.sample = action.payload;
      state.status = 'succeeded';
    },
    userRecordsReceived(state, action: PayloadAction<Obligation[]>) {
      state.userEntered = action.payload;
      state.status = 'succeeded';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadObligations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadObligations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sample = action.payload.sample;
        state.userEntered = action.payload.userEntered;
      })
      .addCase(loadObligations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Could not load your records';
      })
      .addCase(addObligation.fulfilled, (state, action) => {
        state.userEntered.push(action.payload);
      })
      .addCase(deleteObligation.fulfilled, (state, action) => {
        state.userEntered = state.userEntered.filter((row) => row.id !== action.payload);
      })
      .addCase(settleObligation.fulfilled, (state, action) => {
        if (!replaceIn(state.userEntered, action.payload)) {
          replaceIn(state.sample, action.payload);
        }
      });
  },
});

export const { sampleReceived, userRecordsReceived } = ledgerSlice.actions;
export default ledgerSlice.reducer;
