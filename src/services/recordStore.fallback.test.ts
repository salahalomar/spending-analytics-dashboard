/**
 * The fallback paths, exercised without a working IndexedDB.
 *
 * This file deliberately does not import `fake-indexeddb`, so the store sees
 * an environment with no IndexedDB at all — the same situation as a browser
 * with site data blocked.
 */
import { createRecordStore, isPersistenceAvailable, TRANSACTIONS_STORE } from './recordStore';

interface Row {
  id: string;
  label: string;
}

describe('recordStore without IndexedDB', () => {
  it('reports that persistence is unavailable', () => {
    expect(isPersistenceAvailable()).toBe(false);
  });

  it('still works, in memory, so the app keeps running', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);

    expect(await store.getAll()).toEqual([]);

    await store.put({ id: 'a', label: 'first' });
    expect(await store.getAll()).toEqual([{ id: 'a', label: 'first' }]);

    await store.put({ id: 'a', label: 'second' });
    expect(await store.getAll()).toEqual([{ id: 'a', label: 'second' }]);

    await store.remove('a');
    expect(await store.getAll()).toEqual([]);
  });

  it('clears without complaint', async () => {
    const store = createRecordStore<Row>(TRANSACTIONS_STORE);
    await store.put({ id: 'a', label: 'first' });
    await store.clear();
    expect(await store.getAll()).toEqual([]);
  });

  it('gives each store its own memory, so the two do not bleed together', async () => {
    const transactions = createRecordStore<Row>(TRANSACTIONS_STORE);
    const obligations = createRecordStore<Row>('obligations');

    await transactions.put({ id: 'a', label: 'a transaction' });
    expect(await obligations.getAll()).toEqual([]);
  });
});
