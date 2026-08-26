import { createStore } from '@/app/store';
import { makeObligation } from '@/test/fixtures';
import reducer, {
  addObligation,
  deleteObligation,
  draftToObligation,
  initialState,
  loadObligations,
  sampleReceived,
  settleObligation,
  userRecordsReceived,
  type ObligationDraft,
} from './ledgerSlice';

const DRAFT: ObligationDraft = {
  direction: 'receivable',
  counterparty: '  Jamie  ',
  kind: 'person',
  reference: '  Festival tickets  ',
  amountMinor: 5000,
  amountPaidMinor: 0,
  issuedOn: '2025-06-01',
  dueOn: '2025-07-01',
  notes: '  ',
};

describe('draftToObligation', () => {
  it('trims the free text and marks the record as the user’s own', () => {
    expect(draftToObligation(DRAFT, 'obl_fixed')).toMatchObject({
      id: 'obl_fixed',
      counterparty: 'Jamie',
      reference: 'Festival tickets',
      notes: '',
      userEntered: true,
      state: 'outstanding',
    });
  });

  it('opens as settled when it is already paid in full', () => {
    const paid = draftToObligation({ ...DRAFT, amountPaidMinor: 5000 });
    expect(paid.state).toBe('settled');
  });

  it('never records more paid than is owed', () => {
    const overpaid = draftToObligation({ ...DRAFT, amountPaidMinor: 9999 });
    expect(overpaid.amountPaidMinor).toBe(5000);
  });
});

describe('ledgerSlice', () => {
  it('starts empty and idle', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('accepts injected sample and user records', () => {
    const sample = [makeObligation({ id: 's1' })];
    const own = [makeObligation({ id: 'u1', userEntered: true })];

    let state = reducer(initialState, sampleReceived(sample));
    state = reducer(state, userRecordsReceived(own));

    expect(state.sample).toEqual(sample);
    expect(state.userEntered).toEqual(own);
    expect(state.status).toBe('succeeded');
  });

  describe('loadObligations', () => {
    it('reports loading, then stores both sets', () => {
      const pending = reducer(initialState, loadObligations.pending('req'));
      expect(pending.status).toBe('loading');

      const sample = [makeObligation({ id: 's1' })];
      const done = reducer(pending, loadObligations.fulfilled({ sample, userEntered: [] }, 'req'));
      expect(done.status).toBe('succeeded');
      expect(done.sample).toEqual(sample);
    });

    it('surfaces the error message on failure', () => {
      const state = reducer(
        initialState,
        loadObligations.rejected(new Error('storage is unavailable'), 'req'),
      );
      expect(state.status).toBe('failed');
      expect(state.error).toBe('storage is unavailable');
    });

    it('loads sample debts through the real store', async () => {
      const store = createStore();
      await store.dispatch(loadObligations());

      const { sample } = store.getState().ledger;
      expect(sample.length).toBeGreaterThan(0);
      expect(sample.some((row) => row.direction === 'receivable')).toBe(true);
      expect(sample.some((row) => row.direction === 'payable')).toBe(true);
    });
  });

  describe('user records', () => {
    it('adds and removes', () => {
      const added = reducer(
        initialState,
        addObligation.fulfilled(makeObligation({ id: 'u1', userEntered: true }), 'req', DRAFT),
      );
      expect(added.userEntered).toHaveLength(1);

      const removed = reducer(added, deleteObligation.fulfilled('u1', 'req', 'u1'));
      expect(removed.userEntered).toEqual([]);
    });

    it('persists through the real store', async () => {
      const store = createStore();
      await store.dispatch(addObligation(DRAFT));

      expect(store.getState().ledger.userEntered[0]).toMatchObject({
        counterparty: 'Jamie',
        amountMinor: 5000,
        userEntered: true,
      });
    });
  });

  describe('settleObligation', () => {
    it('records a part payment without closing the debt', async () => {
      const store = createStore();
      store.dispatch(
        userRecordsReceived([makeObligation({ id: 'u1', amountMinor: 5000, userEntered: true })]),
      );

      await store.dispatch(settleObligation({ id: 'u1', amountMinor: 2000 }));

      const row = store.getState().ledger.userEntered[0]!;
      expect(row.amountPaidMinor).toBe(2000);
      expect(row.state).toBe('outstanding');
    });

    it('closes the debt once it is paid off', async () => {
      const store = createStore();
      store.dispatch(
        userRecordsReceived([makeObligation({ id: 'u1', amountMinor: 5000, userEntered: true })]),
      );

      await store.dispatch(settleObligation({ id: 'u1', amountMinor: 5000 }));
      expect(store.getState().ledger.userEntered[0]!.state).toBe('settled');
    });

    it('never records more than the amount owed', async () => {
      const store = createStore();
      store.dispatch(
        userRecordsReceived([makeObligation({ id: 'u1', amountMinor: 5000, userEntered: true })]),
      );

      await store.dispatch(settleObligation({ id: 'u1', amountMinor: 999_999 }));
      expect(store.getState().ledger.userEntered[0]!.amountPaidMinor).toBe(5000);
    });

    it('settles a sample record in memory, without writing it to storage', async () => {
      const store = createStore();
      store.dispatch(sampleReceived([makeObligation({ id: 's1', amountMinor: 4000 })]));

      await store.dispatch(settleObligation({ id: 's1', amountMinor: 4000 }));

      expect(store.getState().ledger.sample[0]!.state).toBe('settled');
      expect(store.getState().ledger.userEntered).toEqual([]);
    });

    it('rejects when the record has gone', async () => {
      const store = createStore();
      const result = await store.dispatch(settleObligation({ id: 'missing', amountMinor: 100 }));
      expect(result.type).toBe('ledger/settle/rejected');
    });
  });
});
