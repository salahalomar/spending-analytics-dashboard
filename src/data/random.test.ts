import { gaussian, mulberry32, pick, pickWeighted, randomInt } from './random';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const first = Array.from({ length: 6 }, mulberry32(42));
    const second = Array.from({ length: 6 }, mulberry32(42));
    expect(first).toEqual(second);
  });

  it('produces a different sequence for a different seed', () => {
    expect(Array.from({ length: 6 }, mulberry32(1))).not.toEqual(
      Array.from({ length: 6 }, mulberry32(2)),
    );
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('stays within the inclusive bounds', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 300; i += 1) {
      const value = randomInt(rng, 5, 9);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(9);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('can return both ends of the range', () => {
    const rng = mulberry32(11);
    const seen = new Set(Array.from({ length: 200 }, () => randomInt(rng, 0, 1)));
    expect(seen).toEqual(new Set([0, 1]));
  });
});

describe('pick', () => {
  it('only ever returns members of the list', () => {
    const rng = mulberry32(5);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('throws on an empty list rather than returning undefined', () => {
    expect(() => pick(mulberry32(1), [])).toThrow('pick() called with an empty list');
  });
});

describe('pickWeighted', () => {
  it('respects the weights', () => {
    const rng = mulberry32(99);
    const counts = { common: 0, rare: 0 };

    for (let i = 0; i < 4000; i += 1) {
      counts[pickWeighted(rng, [['common', 9] as const, ['rare', 1] as const])] += 1;
    }

    // 9:1 odds — allow a generous margin so the test is not flaky.
    expect(counts.common).toBeGreaterThan(counts.rare * 5);
  });

  it('never returns a zero-weight entry when another option exists', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 200; i += 1) {
      expect(pickWeighted(rng, [['yes', 1] as const, ['no', 0] as const])).toBe('yes');
    }
  });
});

describe('gaussian', () => {
  it('centres on the requested mean', () => {
    const rng = mulberry32(8);
    const samples = Array.from({ length: 5000 }, () => gaussian(rng, 100, 15));
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(mean).toBeGreaterThan(96);
    expect(mean).toBeLessThan(104);
  });

  it('always returns a finite number', () => {
    const rng = mulberry32(12);
    for (let i = 0; i < 1000; i += 1) {
      expect(Number.isFinite(gaussian(rng, 50, 20))).toBe(true);
    }
  });
});
