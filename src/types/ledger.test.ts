import { makeObligation } from '@/test/fixtures';
import {
  ageingBucketFor,
  daysUntilDue,
  deriveStatus,
  isSettled,
  outstandingMinor,
} from './ledger';

const NOW = Date.parse('2025-07-15T12:00:00.000Z');

describe('outstandingMinor', () => {
  it('subtracts what has been paid', () => {
    expect(outstandingMinor(makeObligation({ amountMinor: 5000, amountPaidMinor: 2000 }))).toBe(3000);
  });

  it('never goes negative on an overpayment', () => {
    expect(outstandingMinor(makeObligation({ amountMinor: 5000, amountPaidMinor: 6000 }))).toBe(0);
  });
});

describe('isSettled', () => {
  it('is true once the balance reaches zero, whatever the stored state', () => {
    expect(isSettled(makeObligation({ amountMinor: 5000, amountPaidMinor: 5000 }))).toBe(true);
  });

  it('is true when the state says so', () => {
    expect(isSettled(makeObligation({ state: 'settled' }))).toBe(true);
  });

  it('is false while something is still owed', () => {
    expect(isSettled(makeObligation({ amountMinor: 5000, amountPaidMinor: 4999 }))).toBe(false);
  });
});

describe('deriveStatus', () => {
  it('reports overdue once the due date has passed', () => {
    expect(deriveStatus(makeObligation({ dueOn: '2025-07-14' }), NOW)).toBe('overdue');
  });

  it('is not overdue on the due date itself — the whole day counts', () => {
    expect(deriveStatus(makeObligation({ dueOn: '2025-07-15' }), NOW)).toBe('outstanding');
  });

  it('reports part-paid when something has been paid but not all', () => {
    const obligation = makeObligation({ dueOn: '2025-08-01', amountMinor: 5000, amountPaidMinor: 2000 });
    expect(deriveStatus(obligation, NOW)).toBe('part-paid');
  });

  it('prefers overdue over part-paid, since the date is the urgent fact', () => {
    const obligation = makeObligation({ dueOn: '2025-06-01', amountMinor: 5000, amountPaidMinor: 2000 });
    expect(deriveStatus(obligation, NOW)).toBe('overdue');
  });

  it('reports settled regardless of the date', () => {
    const obligation = makeObligation({ dueOn: '2020-01-01', amountMinor: 5000, amountPaidMinor: 5000 });
    expect(deriveStatus(obligation, NOW)).toBe('settled');
  });

  it('keeps a written-off debt out of the live figures', () => {
    expect(deriveStatus(makeObligation({ state: 'written-off' }), NOW)).toBe('written-off');
  });
});

describe('daysUntilDue', () => {
  it('counts forward to a future date', () => {
    expect(daysUntilDue(makeObligation({ dueOn: '2025-07-25' }), NOW)).toBe(10);
  });

  it('is zero on the day itself', () => {
    expect(daysUntilDue(makeObligation({ dueOn: '2025-07-15' }), NOW)).toBe(0);
  });

  it('goes negative once the date has passed', () => {
    expect(daysUntilDue(makeObligation({ dueOn: '2025-07-05' }), NOW)).toBe(-10);
  });
});

describe('ageingBucketFor', () => {
  it.each([
    ['2025-08-01', 'current'],
    ['2025-07-15', 'current'],
    ['2025-07-14', '1-30'],
    ['2025-06-15', '1-30'],
    ['2025-06-01', '31-60'],
    ['2025-05-10', '61-90'],
    ['2025-01-01', '90+'],
  ])('puts a debt due %s in the %s bucket', (dueOn, expected) => {
    expect(ageingBucketFor(makeObligation({ dueOn }), NOW)).toBe(expected);
  });
});
