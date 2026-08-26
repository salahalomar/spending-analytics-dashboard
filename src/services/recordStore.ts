/**
 * A tiny persistence layer for the records the user types in.
 *
 * Only user-entered rows are stored. The sample dataset is regenerated from a
 * fixed seed on every load, so persisting 50,000 generated transactions would
 * be a waste of both space and startup time.
 *
 * IndexedDB is used where it exists and an in-memory map stands in where it
 * does not — server rendering, private-mode browsers that block storage, and
 * test environments without a shim. Callers get the same contract either way,
 * so nothing above this file has to care which is in play.
 */

export interface Identified {
  id: string;
}

export interface RecordStore<T extends Identified> {
  getAll(): Promise<T[]>;
  put(record: T): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const DB_NAME = 'personal-finance-dashboard';
export const DB_VERSION = 1;
export const TRANSACTIONS_STORE = 'transactions';
export const OBLIGATIONS_STORE = 'obligations';

export const STORE_NAMES = [TRANSACTIONS_STORE, OBLIGATIONS_STORE] as const;
export type StoreName = (typeof STORE_NAMES)[number];

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local database'));
    request.onblocked = () => reject(new Error('The local database is blocked by another tab'));
  });

  // A failed open must not be cached, or every later call reuses the rejection.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

/**
 * Closes the current connection and drops the cached handle.
 *
 * Leaving a connection open would block a later version upgrade, and tests
 * rely on this to prove a record survives being read back through a new one.
 */
export function resetDatabaseHandle(): void {
  const closing = dbPromise;
  dbPromise = null;
  void closing?.then((db) => db.close()).catch(() => undefined);
}

function read<T>(storeName: StoreName, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = work(transaction.objectStore(storeName));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Local database request failed'));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error('Local database transaction aborted'));
      }),
  );
}

/**
 * Writes resolve on transaction completion, not on request success.
 *
 * A request succeeds before its transaction commits, so resolving there would
 * let a caller believe a record was durable while it was still in flight — and
 * a reload at that moment would lose it.
 */
function write(storeName: StoreName, work: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        let failure: Error | null = null;

        const request = work(transaction.objectStore(storeName));
        request.onerror = () => {
          failure = request.error ?? new Error('Local database request failed');
        };

        transaction.oncomplete = () => (failure ? reject(failure) : resolve());
        transaction.onerror = () =>
          reject(failure ?? transaction.error ?? new Error('Local database write failed'));
        transaction.onabort = () =>
          reject(failure ?? transaction.error ?? new Error('Local database transaction aborted'));
      }),
  );
}

function createIndexedDbStore<T extends Identified>(storeName: StoreName): RecordStore<T> {
  return {
    getAll: () => read<T[]>(storeName, (store) => store.getAll() as IDBRequest<T[]>),
    put: (record) => write(storeName, (store) => store.put(record)),
    remove: (id) => write(storeName, (store) => store.delete(id)),
    clear: () => write(storeName, (store) => store.clear()),
  };
}

function createMemoryStore<T extends Identified>(): RecordStore<T> {
  const records = new Map<string, T>();

  return {
    getAll: async () => Array.from(records.values()),
    put: async (record) => {
      records.set(record.id, record);
    },
    remove: async (id) => {
      records.delete(id);
    },
    clear: async () => {
      records.clear();
    },
  };
}

/**
 * Returns the best available store for `storeName`.
 *
 * The IndexedDB implementation is wrapped so that a storage failure at runtime
 * — quota exceeded, storage disabled mid-session — degrades to the in-memory
 * store rather than breaking the page. The user loses persistence, not the app.
 */
export function createRecordStore<T extends Identified>(storeName: StoreName): RecordStore<T> {
  if (!hasIndexedDb()) return createMemoryStore<T>();

  const primary = createIndexedDbStore<T>(storeName);
  const fallback = createMemoryStore<T>();
  let degraded = false;

  async function withFallback<R>(
    viaPrimary: () => Promise<R>,
    viaFallback: () => Promise<R>,
  ): Promise<R> {
    if (degraded) return viaFallback();

    try {
      return await viaPrimary();
    } catch {
      degraded = true;
      return viaFallback();
    }
  }

  return {
    getAll: () => withFallback(() => primary.getAll(), () => fallback.getAll()),
    put: (record) => withFallback(() => primary.put(record), () => fallback.put(record)),
    remove: (id) => withFallback(() => primary.remove(id), () => fallback.remove(id)),
    clear: () => withFallback(() => primary.clear(), () => fallback.clear()),
  };
}

export const isPersistenceAvailable = hasIndexedDb;
