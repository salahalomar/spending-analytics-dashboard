import { useMemo, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectSpendByMonth } from '@/features/transactions/selectors';
import { useElementSize } from '@/hooks/useElementSize';
import { formatMonthLabel } from '@/utils/date';
import { formatCompactCurrency, formatCount, formatCurrency } from '@/utils/format';
import {
  buildAreaPath,
  buildLinePath,
  buildTicks,
  nearestIndexForX,
  niceUpperBound,
  scaleIndexToX,
  scaleValueToY,
} from '@/utils/scale';
import styles from './MonthlyTrendChart.module.css';

const PADDING = { top: 12, right: 12, bottom: 22, left: 54 } as const;
const GRADIENT_ID = 'monthly-trend-fill';

/**
 * Spend per month as a filled line chart.
 *
 * Drawn directly as SVG at measured pixel dimensions, so stroke widths and
 * label sizes stay constant regardless of the container's width. Hover works
 * with both the pointer and the arrow keys.
 */
export function MonthlyTrendChart() {
  const data = useAppSelector(selectSpendByMonth);
  const [wrapperRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const innerHeight = Math.max(0, height - PADDING.top - PADDING.bottom);

  const geometry = useMemo(() => {
    if (data.length === 0 || innerWidth <= 0 || innerHeight <= 0) {
      return { points: [], ticks: [] as number[], domainMax: 0 };
    }

    const domainMax = niceUpperBound(Math.max(...data.map((datum) => datum.totalMinor)));
    const points = data.map((datum, index) => ({
      x: scaleIndexToX(index, data.length, innerWidth),
      y: scaleValueToY(datum.totalMinor, domainMax, innerHeight),
    }));

    return { points, ticks: buildTicks(domainMax), domainMax };
  }, [data, innerWidth, innerHeight]);

  if (data.length === 0) {
    return (
      <div className={styles.wrapper} ref={wrapperRef}>
        <p className={styles.empty}>No spend in this selection.</p>
      </div>
    );
  }

  const { points, ticks, domainMax } = geometry;
  const activeIndex = hoverIndex === null ? null : Math.min(hoverIndex, data.length - 1);
  const activeDatum = activeIndex === null ? null : data[activeIndex];
  const activePoint = activeIndex === null ? null : points[activeIndex];

  // Label every nth month so the axis never overlaps itself.
  const labelStride = Math.max(1, Math.ceil(data.length / 7));

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - PADDING.left;
    const index = nearestIndexForX(points, x);
    setHoverIndex(index === -1 ? null : index);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const base = activeIndex ?? (step === 1 ? -1 : data.length);
    setHoverIndex(Math.min(Math.max(base + step, 0), data.length - 1));
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef} data-testid="monthly-trend-chart">
      {width > 0 && height > 0 ? (
        <svg
          className={styles.svg}
          width={width}
          height={height}
          role="img"
          tabIndex={0}
          aria-label={`Spend per month across ${data.length} months. Use the arrow keys to step through the series; the same figures are available as a table.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={handleKeyDown}
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {ticks.map((tick) => {
              const y = scaleValueToY(tick, domainMax, innerHeight);
              return (
                <g key={tick}>
                  <line className={styles.grid} x1={0} y1={y} x2={innerWidth} y2={y} />
                  <text className={styles.axisLabel} x={-8} y={y + 3} textAnchor="end">
                    {formatCompactCurrency(tick)}
                  </text>
                </g>
              );
            })}

            <path d={buildAreaPath(points, innerHeight)} fill={`url(#${GRADIENT_ID})`} />
            <path className={styles.line} d={buildLinePath(points)} />

            {activePoint ? (
              <g>
                <line
                  className={styles.guide}
                  x1={activePoint.x}
                  y1={0}
                  x2={activePoint.x}
                  y2={innerHeight}
                />
                <circle className={styles.marker} cx={activePoint.x} cy={activePoint.y} r={4.5} />
              </g>
            ) : null}

            {data.map((datum, index) =>
              index % labelStride === 0 ? (
                <text
                  key={datum.month}
                  className={styles.axisLabel}
                  x={points[index]!.x}
                  y={innerHeight + 15}
                  textAnchor="middle"
                >
                  {formatMonthLabel(datum.month)}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      ) : null}

      {/* The SVG is decorative to assistive tech; these are the actual numbers. */}
      <table className="sr-only">
        <caption>Spend per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Total spend</th>
            <th scope="col">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.month}>
              <th scope="row">{formatMonthLabel(datum.month)}</th>
              <td>{formatCurrency(datum.totalMinor)}</td>
              <td>{formatCount(datum.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeDatum && activePoint ? (
        <div
          className={styles.tooltip}
          style={{ left: `${PADDING.left + activePoint.x}px` }}
          data-testid="trend-tooltip"
        >
          <span className={styles.tooltipMonth}>{formatMonthLabel(activeDatum.month)}</span>
          <span className={`${styles.tooltipValue} numeric`}>
            {formatCurrency(activeDatum.totalMinor)}
          </span>
          <span className={styles.tooltipCount}>{formatCount(activeDatum.count)} transactions</span>
        </div>
      ) : null}
    </div>
  );
}
