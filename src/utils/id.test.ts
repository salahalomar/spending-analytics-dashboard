import { createId } from './id';

describe('createId', () => {
  it('prefixes the id so its type is readable at a glance', () => {
    expect(createId('txn')).toMatch(/^txn_/);
    expect(createId('obl')).toMatch(/^obl_/);
  });

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId('txn')));
    expect(ids.size).toBe(500);
  });

  describe('without crypto.randomUUID', () => {
    const original = globalThis.crypto;

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    });

    it('falls back to a counter rather than throwing', () => {
      // Older browsers and non-secure contexts have no randomUUID.
      Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });

      const ids = Array.from({ length: 50 }, () => createId('txn'));
      expect(new Set(ids).size).toBe(50);
      for (const id of ids) {
        expect(id).toMatch(/^txn_/);
      }
    });
  });
});
