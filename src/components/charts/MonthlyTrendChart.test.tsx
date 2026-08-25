import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransaction } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { initialState as filtersInitialState } from '@/features/filters/filtersSlice';
import type { Transaction } from '@/types/transaction';
import { MonthlyTrendChart } from './MonthlyTrendChart';

const MONTHLY: Transaction[] = [
  makeTransaction({ date: '2025-04-10T10:00:00.000Z', amountMinor: 10_000 }),
  makeTransaction({ date: '2025-05-10T10:00:00.000Z', amountMinor: 20_000 }),
  makeTransaction({ date: '2025-05-20T10:00:00.000Z', amountMinor: 5000 }),
  makeTransaction({ date: '2025-06-10T10:00:00.000Z', amountMinor: 30_000 }),
];

function renderChart(items: Transaction[] = MONTHLY, filters = {}) {
  return renderWithStore(<MonthlyTrendChart />, {
    preloadedState: {
      transactions: { ...transactionsInitialState, items, status: 'succeeded' },
      filters: { ...filtersInitialState, ...filters },
    },
  });
}

describe('MonthlyTrendChart', () => {
  it('draws a line across the months in the selection', () => {
    renderChart();

    const chart = screen.getByRole('img', { name: /spend per month across 3 months/i });
    expect(chart).toBeInTheDocument();

    // The line path holds one point per month: a move plus two line commands.
    // (The area path is drawn first and additionally closes to the baseline.)
    const line = chart.querySelector('path.line')!;
    expect(line.getAttribute('d')?.match(/L/g)).toHaveLength(2);
  });

  it('labels the value axis in compact currency, rounded to a nice bound', () => {
    renderChart();
    // The tallest month is £300, which rounds up to a £500 axis.
    expect(screen.getByText('£500')).toBeInTheDocument();
    expect(screen.getByText('£250')).toBeInTheDocument();
  });

  it('shows no tooltip until the series is interrogated', () => {
    renderChart();
    expect(screen.queryByTestId('trend-tooltip')).not.toBeInTheDocument();
  });

  it('steps through the series with the arrow keys', () => {
    renderChart();
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    let tooltip = screen.getByTestId('trend-tooltip');
    expect(tooltip).toHaveTextContent('Apr 25');
    expect(tooltip).toHaveTextContent('£100.00');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    tooltip = screen.getByTestId('trend-tooltip');
    expect(tooltip).toHaveTextContent('May 25');
    expect(tooltip).toHaveTextContent('£250.00');
    expect(tooltip).toHaveTextContent('2 transactions');
  });

  it('stops at the ends of the series', () => {
    renderChart();
    const chart = screen.getByRole('img');

    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' });
    }
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('Jun 25');

    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    }
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('Apr 25');
  });

  it('ignores keys that are not arrows', () => {
    renderChart();
    fireEvent.keyDown(screen.getByRole('img'), { key: 'Enter' });
    expect(screen.queryByTestId('trend-tooltip')).not.toBeInTheDocument();
  });

  it('selects the nearest month to the pointer', () => {
    renderChart();
    const chart = screen.getByRole('img');
    chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 600 }) as DOMRect;

    // The plot area starts 54px in and spans 834px, so the far right is Jun.
    fireEvent.pointerMove(chart, { clientX: 880 });
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('Jun 25');

    fireEvent.pointerMove(chart, { clientX: 60 });
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('Apr 25');
  });

  it('dismisses the tooltip when the pointer leaves', () => {
    renderChart();
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(screen.getByTestId('trend-tooltip')).toBeInTheDocument();

    fireEvent.pointerLeave(chart);
    expect(screen.queryByTestId('trend-tooltip')).not.toBeInTheDocument();
  });

  it('exposes the series as a table for assistive technology', () => {
    renderChart();

    const table = screen.getByRole('table', { name: /spend per month/i });
    expect(within(table).getByRole('rowheader', { name: 'May 25' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '£250.00' })).toBeInTheDocument();

    // One header row plus one row per month.
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('says so when the selection is empty', () => {
    renderChart(MONTHLY, { merchantQuery: 'no-such-merchant' });
    expect(screen.getByText(/no spend in this selection/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
