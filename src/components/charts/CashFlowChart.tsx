import { useMemo, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectCashFlowByMonth } from '@/features/transactions/selectors';
import { useElementSize } from '@/hooks/useElementSize';
import { formatMonthLabel } from '@/utils/date';
import { formatCompactCurrency, formatCurrency, formatSignedCurrency } from '@/utils/format';
import {
  buildAreaPath,
  buildLinePath,
  buildTicks,
  nearestIndexForX,
  niceUpperBound,
  scaleIndexToX,
  scaleValueToY,
} from '@/utils/scale';
import styles from './CashFlowChart.module.css';

const PADDING = { top: 12, right: 12, bottom: 22, left: 54 } as const;
const GRADIENT_ID = 'cash-flow-fill';

/**
 * Money in and money out per month, as two lines over a shared axis.
 *
 * Drawn directly as SVG at measured pixel dimensions, so stroke widths and
 * label sizes stay constant regardless of the container's width. Hover works
 * with both the pointer and the arrow keys.
 */
export function CashFlowChart() {
  const data = useAppSelector(selectCashFlowByMonth);
  const [wrapperRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const innerHeight = Math.max(0, height - PADDING.top - PADDING.bottom);

  const geometry = useMemo(() => {
    if (data.length === 0 || innerWidth <= 0 || innerHeight <= 0) {
      return { incomePoints: [], expensePoints: [], ticks: [] as number[], domainMax: 0 };
    }

    const peak = Math.max(
      ...data.map((datum) => Math.max(datum.incomeMinor, datum.expenseMinor)),
    );
    const domainMax = niceUpperBound(peak);

    const pointsFor = (pick: (index: number) => number) =>
      data.map((_, index) => ({
        x: scaleIndexToX(index, data.length, innerWidth),
        y: scaleValueToY(pick(index), domainMax, innerHeight),
      }));

    return {
      incomePoints: pointsFor((index) => data[index]!.incomeMinor),
      expensePoints: pointsFor((index) => data[index]!.expenseMinor),
      ticks: buildTicks(domainMax),
      domainMax,
    };
  }, [data, innerWidth, innerHeight]);

  if (data.length === 0) {
    return (
      <div className={styles.wrapper} ref={wrapperRef}>
        <p className={styles.empty}>Nothing in this selection.</p>
      </div>
    );
  }

  const { incomePoints, expensePoints, ticks, domainMax } = geometry;
  const activeIndex = hoverIndex === null ? null : Math.min(hoverIndex, data.length - 1);
  const activeDatum = activeIndex === null ? null : data[activeIndex];
  const activeX = activeIndex === null ? null : incomePoints[activeIndex]?.x ?? null;

  // Label every nth month so the axis never overlaps itself.
  const labelStride = Math.max(1, Math.ceil(data.length / 7));

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - PADDING.left;
    const index = nearestIndexForX(incomePoints, x);
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
    <div className={styles.wrapper} data-testid="cash-flow-chart">
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendIncome}`} aria-hidden="true" />
          Money in
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendExpense}`} aria-hidden="true" />
          Money out
        </span>
      </div>

      <div className={styles.plot} ref={wrapperRef}>
      {width > 0 && height > 0 ? (
        <svg
          className={styles.svg}
          width={width}
          height={height}
          role="img"
          tabIndex={0}
          aria-label={`Money in and out per month across ${data.length} months. Use the arrow keys to step through the series.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={handleKeyDown}
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--negative)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--negative)" stopOpacity="0.02" />
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

            <path d={buildAreaPath(expensePoints, innerHeight)} fill={`url(#${GRADIENT_ID})`} />
            <path className={styles.expenseLine} d={buildLinePath(expensePoints)} />
            <path className={styles.incomeLine} d={buildLinePath(incomePoints)} />

            {activeX !== null ? (
              <g>
                <line className={styles.guide} x1={activeX} y1={0} x2={activeX} y2={innerHeight} />
                <circle
                  className={`${styles.marker} ${styles.markerIncome}`}
                  cx={activeX}
                  cy={incomePoints[activeIndex!]!.y}
                  r={4}
                />
                <circle
                  className={`${styles.marker} ${styles.markerExpense}`}
                  cx={activeX}
                  cy={expensePoints[activeIndex!]!.y}
                  r={4}
                />
              </g>
            ) : null}

            {data.map((datum, index) =>
              index % labelStride === 0 ? (
                <text
                  key={datum.month}
                  className={styles.axisLabel}
                  x={incomePoints[index]!.x}
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
      </div>

      {activeDatum && activeX !== null ? (
        <div
          className={styles.tooltip}
          style={{ left: `${PADDING.left + activeX}px` }}
          data-testid="cash-flow-tooltip"
        >
          <span className={styles.tooltipMonth}>{formatMonthLabel(activeDatum.month)}</span>
          <span className={styles.tooltipRow}>
            <span className={`${styles.legendSwatch} ${styles.legendIncome}`} aria-hidden="true" />
            In <strong className="numeric">{formatCurrency(activeDatum.incomeMinor)}</strong>
          </span>
          <span className={styles.tooltipRow}>
            <span className={`${styles.legendSwatch} ${styles.legendExpense}`} aria-hidden="true" />
            Out <strong className="numeric">{formatCurrency(activeDatum.expenseMinor)}</strong>
          </span>
          <span className={styles.tooltipNet}>
            Net{' '}
            <strong className="numeric">{formatSignedCurrency(activeDatum.netMinor)}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}
