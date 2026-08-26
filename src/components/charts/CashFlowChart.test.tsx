import { fireEvent, screen } from '@testing-library/react';
import { renderWithStore } from '@/test/renderWithStore';
import { makeTransaction } from '@/test/fixtures';
import { initialState as transactionsInitialState } from '@/features/transactions/transactionsSlice';
import { initialState as filtersInitialState } from '@/features/filters/filtersSlice';
import type { Transaction } from '@/types/transaction';
import { CashFlowChart } from './CashFlowChart';

const MONTHLY: Transaction[] = [
  makeTransaction({ date: '2025-04-10T10:00:00.000Z', amountMinor: 10_000 }),
  makeTransaction({ date: '2025-05-10T10:00:00.000Z', amountMinor: 20_000 }),
  makeTransaction({ date: '2025-05-20T10:00:00.000Z', amountMinor: 5000 }),
  makeTransaction({ date: '2025-06-10T10:00:00.000Z', amountMinor: 30_000 }),
  makeTransaction({
    date: '2025-06-02T10:00:00.000Z',
    direction: 'income',
    category: 'Salary',
    counterparty: 'Monthly Salary',
    amountMinor: 40_000,
  }),
];

function renderChart(items: Transaction[] = MONTHLY, filters = {}) {
  return renderWithStore(<CashFlowChart />, {
    preloadedState: {
      transactions: { ...transactionsInitialState, sample: items, status: 'succeeded' },
      filters: { ...filtersInitialState, ...filters },
    },
  });
}

describe('CashFlowChart', () => {
  it('draws a line per series across the months in the selection', () => {
    renderChart();

    const chart = screen.getByRole('img', { name: /money in and out per month across 3 months/i });
    expect(chart).toBeInTheDocument();

    // One point per month on each series: a move plus two line commands.
    expect(chart.querySelector('path.incomeLine')?.getAttribute('d')?.match(/L/g)).toHaveLength(2);
    expect(chart.querySelector('path.expenseLine')?.getAttribute('d')?.match(/L/g)).toHaveLength(2);
  });

  it('labels the value axis in compact currency, rounded to a nice bound', () => {
    renderChart();
    // The tallest month is £400, which rounds up to a £500 axis.
    expect(screen.getByText('£500')).toBeInTheDocument();
    expect(screen.getByText('£250')).toBeInTheDocument();
  });

  it('names both series in the legend', () => {
    renderChart();
    expect(screen.getByText('Money in')).toBeInTheDocument();
    expect(screen.getByText('Money out')).toBeInTheDocument();
  });

  it('shows no tooltip until the series is interrogated', () => {
    renderChart();
    expect(screen.queryByTestId('cash-flow-tooltip')).not.toBeInTheDocument();
  });

  it('steps through the series with the arrow keys', () => {
    renderChart();
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(screen.getByTestId('cash-flow-tooltip')).toHaveTextContent('Apr 25');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    const tooltip = screen.getByTestId('cash-flow-tooltip');
    expect(tooltip).toHaveTextContent('May 25');
    expect(tooltip).toHaveTextContent('£250.00');
  });

  it('shows money in, money out and the net for the hovered month', () => {
    renderChart();
    const chart = screen.getByRole('img');

    for (let i = 0; i < 3; i += 1) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' });
    }

    const tooltip = screen.getByTestId('cash-flow-tooltip');
    expect(tooltip).toHaveTextContent('Jun 25');
    expect(tooltip).toHaveTextContent('£400.00');
    expect(tooltip).toHaveTextContent('£300.00');
    expect(tooltip).toHaveTextContent('+£100.00');
  });

  it('stops at the ends of the series', () => {
    renderChart();
    const chart = screen.getByRole('img');

    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' });
    }
    expect(screen.getByTestId('cash-flow-tooltip')).toHaveTextContent('Jun 25');

    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    }
    expect(screen.getByTestId('cash-flow-tooltip')).toHaveTextContent('Apr 25');
  });

  it('ignores keys that are not arrows', () => {
    renderChart();
    fireEvent.keyDown(screen.getByRole('img'), { key: 'Enter' });
    expect(screen.queryByTestId('cash-flow-tooltip')).not.toBeInTheDocument();
  });

  it('selects the nearest month to the pointer', () => {
    renderChart();
    const chart = screen.getByRole('img');
    chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 600 }) as DOMRect;

    // The plot area starts 54px in and spans 834px, so the far right is Jun.
    fireEvent.pointerMove(chart, { clientX: 880 });
    expect(screen.getByTestId('cash-flow-tooltip')).toHaveTextContent('Jun 25');

    fireEvent.pointerMove(chart, { clientX: 60 });
    expect(screen.getByTestId('cash-flow-tooltip')).toHaveTextContent('Apr 25');
  });

  it('dismisses the tooltip when the pointer leaves', () => {
    renderChart();
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(screen.getByTestId('cash-flow-tooltip')).toBeInTheDocument();

    fireEvent.pointerLeave(chart);
    expect(screen.queryByTestId('cash-flow-tooltip')).not.toBeInTheDocument();
  });

  it('says so when the selection is empty', () => {
    renderChart(MONTHLY, { counterpartyQuery: 'no-such-name' });
    expect(screen.getByText(/nothing in this selection/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
