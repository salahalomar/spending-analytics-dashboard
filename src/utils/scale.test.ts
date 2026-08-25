import {
  buildAreaPath,
  buildLinePath,
  buildTicks,
  nearestIndexForX,
  niceUpperBound,
  scaleIndexToX,
  scaleValueToY,
} from './scale';

describe('niceUpperBound', () => {
  it.each([
    [1, 1],
    [8, 10],
    [12, 20],
    [23, 25],
    [41_833, 50_000],
    [180_000, 200_000],
  ])('rounds %d up to %d', (input, expected) => {
    expect(niceUpperBound(input)).toBe(expected);
  });

  it('falls back to 1 for non-positive and non-finite input', () => {
    expect(niceUpperBound(0)).toBe(1);
    expect(niceUpperBound(-50)).toBe(1);
    expect(niceUpperBound(Number.NaN)).toBe(1);
  });
});

describe('buildTicks', () => {
  it('spans zero to a nice upper bound', () => {
    expect(buildTicks(41_833, 4)).toEqual([0, 12_500, 25_000, 37_500, 50_000]);
  });

  it('honours the requested tick count', () => {
    expect(buildTicks(100, 2)).toHaveLength(3);
    expect(buildTicks(100, 5)).toHaveLength(6);
  });
});

describe('scaleValueToY', () => {
  it('puts zero on the baseline and the domain max at the top', () => {
    expect(scaleValueToY(0, 100, 200)).toBe(200);
    expect(scaleValueToY(100, 100, 200)).toBe(0);
    expect(scaleValueToY(50, 100, 200)).toBe(100);
  });

  it('clamps values outside the domain', () => {
    expect(scaleValueToY(150, 100, 200)).toBe(0);
    expect(scaleValueToY(-10, 100, 200)).toBe(200);
  });

  it('collapses to the baseline when the domain is empty', () => {
    expect(scaleValueToY(10, 0, 200)).toBe(200);
  });
});

describe('scaleIndexToX', () => {
  it('spreads points evenly across the range', () => {
    expect(scaleIndexToX(0, 3, 100)).toBe(0);
    expect(scaleIndexToX(1, 3, 100)).toBe(50);
    expect(scaleIndexToX(2, 3, 100)).toBe(100);
  });

  it('centres a lone point', () => {
    expect(scaleIndexToX(0, 1, 100)).toBe(50);
  });
});

describe('path builders', () => {
  const points = [
    { x: 0, y: 10 },
    { x: 50, y: 0 },
    { x: 100, y: 20 },
  ];

  it('builds a move-then-line path', () => {
    expect(buildLinePath(points)).toBe('M0.00,10.00 L50.00,0.00 L100.00,20.00');
  });

  it('closes the area back down to the baseline', () => {
    expect(buildAreaPath(points, 200)).toBe(
      'M0.00,10.00 L50.00,0.00 L100.00,20.00 L100.00,200.00 L0.00,200.00 Z',
    );
  });

  it('returns an empty string for no points', () => {
    expect(buildLinePath([])).toBe('');
    expect(buildAreaPath([], 200)).toBe('');
  });
});

describe('nearestIndexForX', () => {
  const points = [{ x: 0 }, { x: 50 }, { x: 100 }];

  it('finds the closest point', () => {
    expect(nearestIndexForX(points, 4)).toBe(0);
    expect(nearestIndexForX(points, 40)).toBe(1);
    expect(nearestIndexForX(points, 96)).toBe(2);
  });

  it('clamps to the ends when the pointer runs past the plot', () => {
    expect(nearestIndexForX(points, -200)).toBe(0);
    expect(nearestIndexForX(points, 5000)).toBe(2);
  });

  it('returns -1 when there is nothing to match', () => {
    expect(nearestIndexForX([], 10)).toBe(-1);
  });
});
