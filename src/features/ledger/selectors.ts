import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import {
  AGEING_BUCKETS,
  ageingBucketFor,
  daysUntilDue,
  deriveStatus,
  outstandingMinor,
  type AgeingBucketId,
  type Obligation,
  type ObligationStatus,
} from '@/types/ledger';

const selectSample = (state: RootState) => state.ledger.sample;
const selectUserEntered = (state: RootState) => state.ledger.userEntered;

export const selectLedgerStatus = (state: RootState) => state.ledger.status;
const selectShowSample = (state: RootState) => state.transactions.showSample;

/** Every debt on record, the user's own first. */
export const selectAllObligations = createSelector(
  [selectSample, selectUserEntered, selectShowSample],
  (sample, userEntered, showSample): Obligation[] =>
    showSample ? [...userEntered, ...sample] : userEntered,
);

export const selectReceivables = createSelector([selectAllObligations], (obligations) =>
  obligations.filter((obligation) => obligation.direction === 'receivable'),
);

export const selectPayables = createSelector([selectAllObligations], (obligations) =>
  obligations.filter((obligation) => obligation.direction === 'payable'),
);

export interface ObligationView {
  obligation: Obligation;
  status: ObligationStatus;
  outstandingMinor: number;
  daysUntilDue: number;
  bucket: AgeingBucketId;
}

/**
 * Decorates each record with the values the table shows.
 *
 * `nowMs` is a parameter rather than a call to the clock so this stays pure —
 * a memoised selector reading `Date.now()` would cache a status that silently
 * goes stale the moment a due date passes.
 */
export function toViews(obligations: readonly Obligation[], nowMs: number): ObligationView[] {
  return obligations.map((obligation) => ({
    obligation,
    status: deriveStatus(obligation, nowMs),
    outstandingMinor: outstandingMinor(obligation),
    daysUntilDue: daysUntilDue(obligation, nowMs),
    bucket: ageingBucketFor(obligation, nowMs),
  }));
}

/** Soonest due first, with anything already settled pushed to the bottom. */
export function sortViews(views: readonly ObligationView[]): ObligationView[] {
  return views.slice().sort((a, b) => {
    const aDone = a.status === 'settled' || a.status === 'written-off';
    const bDone = b.status === 'settled' || b.status === 'written-off';
    if (aDone !== bDone) return aDone ? 1 : -1;
    return a.obligation.dueOn.localeCompare(b.obligation.dueOn);
  });
}

export interface LedgerSummary {
  /** Still owed, excluding settled and written-off records. */
  outstandingMinor: number;
  overdueMinor: number;
  overdueCount: number;
  /** Outstanding and due within the next 30 days. */
  dueSoonMinor: number;
  dueSoonCount: number;
  settledMinor: number;
  writtenOffMinor: number;
  openCount: number;
  /** Outstanding balance per ageing bucket. */
  ageing: Record<AgeingBucketId, number>;
}

const EMPTY_AGEING = (): Record<AgeingBucketId, number> =>
  Object.fromEntries(AGEING_BUCKETS.map((bucket) => [bucket.id, 0])) as Record<
    AgeingBucketId,
    number
  >;

/** Totals for one side of the ledger. Pure, so `nowMs` comes from the caller. */
export function summariseObligations(
  obligations: readonly Obligation[],
  nowMs: number,
): LedgerSummary {
  const summary: LedgerSummary = {
    outstandingMinor: 0,
    overdueMinor: 0,
    overdueCount: 0,
    dueSoonMinor: 0,
    dueSoonCount: 0,
    settledMinor: 0,
    writtenOffMinor: 0,
    openCount: 0,
    ageing: EMPTY_AGEING(),
  };

  for (const view of toViews(obligations, nowMs)) {
    if (view.status === 'written-off') {
      summary.writtenOffMinor += view.outstandingMinor;
      continue;
    }

    if (view.status === 'settled') {
      summary.settledMinor += view.obligation.amountMinor;
      continue;
    }

    summary.outstandingMinor += view.outstandingMinor;
    summary.openCount += 1;
    summary.ageing[view.bucket] += view.outstandingMinor;

    if (view.status === 'overdue') {
      summary.overdueMinor += view.outstandingMinor;
      summary.overdueCount += 1;
    } else if (view.daysUntilDue <= 30) {
      summary.dueSoonMinor += view.outstandingMinor;
      summary.dueSoonCount += 1;
    }
  }

  return summary;
}

export interface NetPosition {
  owedToYouMinor: number;
  youOweMinor: number;
  /** Owed to you minus what you owe. Negative means you are net in debt. */
  netMinor: number;
  overdueToYouMinor: number;
  overdueByYouMinor: number;
}

/** The whole-ledger position shown on the overview. */
export function netPosition(
  receivables: readonly Obligation[],
  payables: readonly Obligation[],
  nowMs: number,
): NetPosition {
  const owed = summariseObligations(receivables, nowMs);
  const owing = summariseObligations(payables, nowMs);

  return {
    owedToYouMinor: owed.outstandingMinor,
    youOweMinor: owing.outstandingMinor,
    netMinor: owed.outstandingMinor - owing.outstandingMinor,
    overdueToYouMinor: owed.overdueMinor,
    overdueByYouMinor: owing.overdueMinor,
  };
}

export interface CounterpartyTotal {
  counterparty: string;
  outstandingMinor: number;
  count: number;
  overdue: boolean;
}

/** Groups outstanding balances by who they are with, largest first. */
export function groupByCounterparty(
  obligations: readonly Obligation[],
  nowMs: number,
): CounterpartyTotal[] {
  const totals = new Map<string, CounterpartyTotal>();

  for (const view of toViews(obligations, nowMs)) {
    if (view.status === 'settled' || view.status === 'written-off') continue;

    const existing = totals.get(view.obligation.counterparty);
    if (existing) {
      existing.outstandingMinor += view.outstandingMinor;
      existing.count += 1;
      existing.overdue = existing.overdue || view.status === 'overdue';
    } else {
      totals.set(view.obligation.counterparty, {
        counterparty: view.obligation.counterparty,
        outstandingMinor: view.outstandingMinor,
        count: 1,
        overdue: view.status === 'overdue',
      });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.outstandingMinor - a.outstandingMinor);
}
