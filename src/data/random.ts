/**
 * Deterministic pseudo-random helpers.
 *
 * The dataset is generated in the browser, but every run must produce the same
 * 50,000 transactions — otherwise snapshot-style assertions and the Cypress
 * expectations would drift between runs. `mulberry32` is a small, fast,
 * well-distributed 32-bit PRNG that gives us that for free.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in `[min, max]`, inclusive at both ends. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniformly picks one element. Throws on an empty list so callers fail loudly. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pick() called with an empty list');
  }
  const item = items[Math.floor(rng() * items.length)];
  return item as T;
}

/**
 * Picks an element using integer weights, so common categories such as
 * Groceries show up far more often than Travel and the charts look plausible.
 */
export function pickWeighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = rng() * total;
  for (const [value, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Box–Muller transform, clamped to a sane range. Real spend within a category
 * clusters around a typical value with a long tail, which a uniform
 * distribution would not reproduce.
 */
export function gaussian(rng: Rng, mean: number, stdDev: number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  const magnitude = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + magnitude * stdDev;
}
