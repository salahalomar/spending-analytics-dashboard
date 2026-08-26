/**
 * Money that has been promised but not yet moved — what you owe, and what you
 * are owed.
 *
 * Both are the same shape with opposite signs, so they live in one type and
 * are told apart by `direction`. Keeping them together means the settlement,
 * ageing and totals logic is written once rather than mirrored.
 */
export type ObligationDirection = 'receivable' | 'payable';

/** What kind of debt this is, which changes how it is grouped and chased. */
export const OBLIGATION_KINDS = [
  { id: 'person', label: 'Person' },
  { id: 'credit-card', label: 'Credit card' },
  { id: 'loan', label: 'Loan' },
  { id: 'bill', label: 'Bill' },
  { id: 'other', label: 'Other' },
] as const;

export type ObligationKind = (typeof OBLIGATION_KINDS)[number]['id'];

/** Stored state. `overdue` is never stored — it is derived from the due date. */
export type ObligationState = 'outstanding' | 'settled' | 'written-off';

/** What the UI shows, once the due date has been taken into account. */
export type ObligationStatus = ObligationState | 'overdue' | 'part-paid';

export interface Obligation {
  id: string;
  direction: ObligationDirection;
  /** Who owes you, or who you owe. */
  counterparty: string;
  kind: ObligationKind;
  /** Free text — an account number, or what the debt was for. */
  reference: string;
  /** Gross amount owed, in minor units. Always positive. */
  amountMinor: number;
  /** How much has been settled so far, in minor units. */
  amountPaidMinor: number;
  currency: 'GBP';
  /** `YYYY-MM-DD`. */
  issuedOn: string;
  /** `YYYY-MM-DD`. */
  dueOn: string;
  state: ObligationState;
  notes: string;
  userEntered: boolean;
}

/** Still owed after part payments, in minor units. Never negative. */
export function outstandingMinor(obligation: Obligation): number {
  return Math.max(0, obligation.amountMinor - obligation.amountPaidMinor);
}

export function isSettled(obligation: Obligation): boolean {
  return obligation.state === 'settled' || outstandingMinor(obligation) === 0;
}

/**
 * The status to display.
 *
 * `nowMs` is passed in rather than read from the clock so the derivation stays
 * pure — otherwise every total would silently depend on when it was called.
 */
export function deriveStatus(obligation: Obligation, nowMs: number): ObligationStatus {
  if (obligation.state === 'written-off') return 'written-off';
  if (isSettled(obligation)) return 'settled';

  const dueMs = Date.parse(`${obligation.dueOn}T23:59:59.999Z`);
  if (Number.isFinite(dueMs) && dueMs < nowMs) return 'overdue';

  return obligation.amountPaidMinor > 0 ? 'part-paid' : 'outstanding';
}

/**
 * Whole days until the due date; negative once it has passed. Used for the
 * ageing buckets and the "due soon" warnings.
 */
export function daysUntilDue(obligation: Obligation, nowMs: number): number {
  const dueMs = Date.parse(`${obligation.dueOn}T00:00:00.000Z`);
  if (!Number.isFinite(dueMs)) return 0;

  const startOfToday = Math.floor(nowMs / 86_400_000) * 86_400_000;
  return Math.round((dueMs - startOfToday) / 86_400_000);
}

/** Ageing buckets, by how long a debt has been overdue. */
export const AGEING_BUCKETS = [
  { id: 'current', label: 'Not yet due', minDaysOverdue: -Infinity, maxDaysOverdue: 0 },
  { id: '1-30', label: '1–30 days', minDaysOverdue: 1, maxDaysOverdue: 30 },
  { id: '31-60', label: '31–60 days', minDaysOverdue: 31, maxDaysOverdue: 60 },
  { id: '61-90', label: '61–90 days', minDaysOverdue: 61, maxDaysOverdue: 90 },
  { id: '90+', label: 'Over 90 days', minDaysOverdue: 91, maxDaysOverdue: Infinity },
] as const;

export type AgeingBucketId = (typeof AGEING_BUCKETS)[number]['id'];

export function ageingBucketFor(obligation: Obligation, nowMs: number): AgeingBucketId {
  const daysOverdue = -daysUntilDue(obligation, nowMs);
  const bucket = AGEING_BUCKETS.find(
    (candidate) => daysOverdue >= candidate.minDaysOverdue && daysOverdue <= candidate.maxDaysOverdue,
  );
  return bucket?.id ?? 'current';
}
