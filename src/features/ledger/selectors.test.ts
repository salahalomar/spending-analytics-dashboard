import { makeObligation } from '@/test/fixtures';
import {
  groupByCounterparty,
  netPosition,
  sortViews,
  summariseObligations,
  toViews,
} from './selectors';

const NOW = Date.parse('2025-07-15T12:00:00.000Z');

const OWED_TO_YOU = [
  makeObligation({ id: 'r1', counterparty: 'Jamie', amountMinor: 5000, dueOn: '2025-07-01' }),
  makeObligation({ id: 'r2', counterparty: 'Priya', amountMinor: 8000, dueOn: '2025-07-20' }),
  makeObligation({ id: 'r3', counterparty: 'Jamie', amountMinor: 3000, dueOn: '2025-09-30' }),
  makeObligation({ id: 'r4', counterparty: 'Tom', amountMinor: 10_000, amountPaidMinor: 10_000, dueOn: '2025-06-01' }),
  makeObligation({ id: 'r5', counterparty: 'Gone', amountMinor: 2000, state: 'written-off', dueOn: '2025-01-01' }),
];

const YOU_OWE = [
  makeObligation({ id: 'p1', direction: 'payable', counterparty: 'Barclaycard', amountMinor: 40_000, dueOn: '2025-07-10' }),
  makeObligation({ id: 'p2', direction: 'payable', counterparty: 'Dad', amountMinor: 20_000, dueOn: '2025-08-05' }),
];

describe('toViews', () => {
  it('decorates each record with what the table shows', () => {
    const [first] = toViews([OWED_TO_YOU[0]!], NOW);
    expect(first).toMatchObject({
      status: 'overdue',
      outstandingMinor: 5000,
      daysUntilDue: -14,
      bucket: '1-30',
    });
  });
});

describe('sortViews', () => {
  it('orders by due date and pushes finished records to the bottom', () => {
    const sorted = sortViews(toViews(OWED_TO_YOU, NOW));
    expect(sorted.map((view) => view.obligation.id)).toEqual(['r1', 'r2', 'r3', 'r5', 'r4']);
  });
});

describe('summariseObligations', () => {
  const summary = summariseObligations(OWED_TO_YOU, NOW);

  it('counts only what is still open', () => {
    // r1 + r2 + r3; r4 is settled and r5 is written off.
    expect(summary.outstandingMinor).toBe(16_000);
    expect(summary.openCount).toBe(3);
  });

  it('separates overdue from merely upcoming', () => {
    expect(summary.overdueMinor).toBe(5000);
    expect(summary.overdueCount).toBe(1);
  });

  it('flags what falls due within thirty days', () => {
    // r2 is due in 5 days; r3 is months away.
    expect(summary.dueSoonMinor).toBe(8000);
    expect(summary.dueSoonCount).toBe(1);
  });

  it('tracks settled and written-off separately from the live balance', () => {
    expect(summary.settledMinor).toBe(10_000);
    expect(summary.writtenOffMinor).toBe(2000);
  });

  it('buckets the outstanding balance by age', () => {
    expect(summary.ageing['1-30']).toBe(5000);
    expect(summary.ageing.current).toBe(11_000);
    expect(summary.ageing['90+']).toBe(0);
  });

  it('returns zeroes for an empty ledger', () => {
    const empty = summariseObligations([], NOW);
    expect(empty.outstandingMinor).toBe(0);
    expect(empty.openCount).toBe(0);
    expect(empty.ageing.current).toBe(0);
  });

  it('counts only the unpaid remainder of a part-paid debt', () => {
    const partPaid = [makeObligation({ amountMinor: 10_000, amountPaidMinor: 4000, dueOn: '2025-08-01' })];
    expect(summariseObligations(partPaid, NOW).outstandingMinor).toBe(6000);
  });
});

describe('netPosition', () => {
  it('nets what you are owed against what you owe', () => {
    const position = netPosition(OWED_TO_YOU, YOU_OWE, NOW);
    expect(position.owedToYouMinor).toBe(16_000);
    expect(position.youOweMinor).toBe(60_000);
    expect(position.netMinor).toBe(-44_000);
  });

  it('surfaces overdue amounts on both sides', () => {
    const position = netPosition(OWED_TO_YOU, YOU_OWE, NOW);
    expect(position.overdueToYouMinor).toBe(5000);
    expect(position.overdueByYouMinor).toBe(40_000);
  });

  it('is zero on both sides for an empty ledger', () => {
    expect(netPosition([], [], NOW)).toMatchObject({
      owedToYouMinor: 0,
      youOweMinor: 0,
      netMinor: 0,
    });
  });
});

describe('groupByCounterparty', () => {
  it('combines multiple debts with the same person, largest first', () => {
    const groups = groupByCounterparty(OWED_TO_YOU, NOW);
    expect(groups[0]).toEqual({ counterparty: 'Jamie', outstandingMinor: 8000, count: 2, overdue: true });
    expect(groups[1]).toEqual({ counterparty: 'Priya', outstandingMinor: 8000, count: 1, overdue: false });
  });

  it('leaves out anyone who has settled up', () => {
    expect(groupByCounterparty(OWED_TO_YOU, NOW).map((g) => g.counterparty)).not.toContain('Tom');
  });
});
