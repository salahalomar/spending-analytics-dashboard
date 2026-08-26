import 'fake-indexeddb/auto';
import {
  createRecordStore,
  isPersistenceAvailable,
  resetDatabaseHandle,
  TRANSACTIONS_STORE,
} from './recordStore';

interface Row {
  id: string;
  label: string;
}

/**
 * Exercises the real IndexedDB path via fake-indexeddb, rather than only the
 * in-memory fallback jsdom would otherwise force.
 */
describe('recordStore backed by IndexedDB', () => {
  beforeEach(async () => {
    resetDatabaseHandle();
    await createRecordStore<Row>(TRANSACTIONS_STORE).clear();
  });

  it('reports that persistence is available', () => {
    expect(isPersistenceAvailable()).toBe(true);
  });

  it('starts empty', async () => {
    expect(await createRecordStore<Row>(TRANSACTIONS_STORE).getAll()).toEqual([]);
  });

  it('round-trips a record', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await store.put({ id: 'a', label: 'first' });

    expect(await store.getAll()).toEqual([{ id: 'a', label: 'first' }]);
  });

  it('survives a fresh handle, which is what a page reload amounts to', async () => {
    await createRecordStore<Row>(TRANSACTIONS_STORE).put({ id: 'a', label: 'first' });

    resetDatabaseHandle();
    expect(await createRecordStore<Row>(TRANSACTIONS_STORE).getAll()).toEqual([
      { id: 'a', label: 'first' },
    ]);
  });

  it('overwrites rather than duplicating on the same id', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await store.put({ id: 'a', label: 'first' });
    await store.put({ id: 'a', label: 'second' });

    expect(await store.getAll()).toEqual([{ id: 'a', label: 'second' }]);
  });

  it('removes a record', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await store.put({ id: 'a', label: 'first' });
    await store.put({ id: 'b', label: 'second' });
    await store.remove('a');

    expect(await store.getAll()).toEqual([{ id: 'b', label: 'second' }]);
  });

  it('ignores a delete for something that is not there', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await expect(store.remove('missing')).resolves.toBeUndefined();
  });

  it('clears everything', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await store.put({ id: 'a', label: 'first' });
    await store.clear();

    expect(await store.getAll()).toEqual([]);
  });

  it('keeps the two stores independent', async () => {
    const transactions = createRecordStore<Row>(TRANSACTIONS_STORE);
    const obligations = createRecordStore<Row>('obligations');

    await transactions.put({ id: 'a', label: 'a transaction' });
    await obligations.put({ id: 'b', label: 'an obligation' });

    expect(await transactions.getAll()).toEqual([{ id: 'a', label: 'a transaction' }]);
    expect(await obligations.getAll()).toEqual([{ id: 'b', label: 'an obligation' }]);

    await obligations.clear();
  });
});
