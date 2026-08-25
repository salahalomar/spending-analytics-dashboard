/**
 * Small scale helpers for the hand-rolled SVG charts. Pure functions, so the
 * axis and path maths can be unit tested without rendering anything.
 */

/**
 * Rounds `value` up to the next "nice" number — 1, 2, 2.5 or 5 times a power
 * of ten. Raw maxima produce axis labels like £41,833; nice ones give £50,000.
 */
export function niceUpperBound(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const fraction = value / magnitude;

  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * magnitude;
}

/** Evenly spaced tick values from 0 to a nice upper bound, inclusive. */
export function buildTicks(maxValue: number, tickCount = 4): number[] {
  const upper = niceUpperBound(maxValue);
  const step = upper / tickCount;
  return Array.from({ length: tickCount + 1 }, (_, index) => Math.round(index * step));
}

/**
 * Maps a value in `[0, domainMax]` onto a pixel position in `[0, rangeSize]`,
 * measured downwards from the top of the plot area.
 */
export function scaleValueToY(value: number, domainMax: number, rangeSize: number): number {
  if (domainMax <= 0) return rangeSize;
  const clamped = Math.min(Math.max(value, 0), domainMax);
  return rangeSize - (clamped / domainMax) * rangeSize;
}

/** Evenly distributes `count` points across `rangeSize`, centring a lone point. */
export function scaleIndexToX(index: number, count: number, rangeSize: number): number {
  if (count <= 1) return rangeSize / 2;
  return (index / (count - 1)) * rangeSize;
}

/** Builds an SVG polyline `d` attribute from already-scaled points. */
export function buildLinePath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');
}

/** Closes a line path down to the baseline so it can be filled as an area. */
export function buildAreaPath(
  points: readonly { x: number; y: number }[],
  baselineY: number,
): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${buildLinePath(points)} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(
    2,
  )},${baselineY.toFixed(2)} Z`;
}

/** Index of the point whose x is closest to `x`. Returns -1 for an empty list. */
export function nearestIndexForX(points: readonly { x: number }[], x: number): number {
  if (points.length === 0) return -1;

  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const distance = Math.abs(points[index]!.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}
