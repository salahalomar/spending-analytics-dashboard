/**
 * Ids for records the user creates.
 *
 * `crypto.randomUUID` is used where available; the counter fallback keeps
 * older browsers and non-secure contexts working, where it is undefined.
 */
let counter = 0;

export function createId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // Fall through to the counter.
  }

  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
