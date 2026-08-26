import type { Obligation, ObligationDirection, ObligationKind } from '@/types/ledger';
import { mulberry32, pickWeighted, randomInt, type Rng } from '@/data/random';
import { datasetEndDate } from '@/data/generateTransactions';

const MS_PER_DAY = 86_400_000;

/** People and accounts a personal ledger tends to involve. */
const OWED_TO_YOU: readonly (readonly [string, ObligationKind, string])[] = [
  ['Jamie Whitfield', 'person', 'Festival tickets'],
  ['Priya Raman', 'person', 'Split dinner — Dishoom'],
  ['Tom Callaghan', 'person', 'Weekend cottage share'],
  ['Aisha Bello', 'person', 'Concert ticket'],
  ['Work Expenses', 'bill', 'Travel claim — March'],
  ['Marcus Hale', 'person', 'Loaned for car repair'],
  ['Ellie Dawson', 'person', 'Group present'],
  ['Landlord', 'bill', 'Deposit return'],
  ['Sam Okafor', 'person', 'Covered their share of rent'],
  ['HMRC', 'bill', 'Tax refund due'],
];

const YOU_OWE: readonly (readonly [string, ObligationKind, string])[] = [
  ['Barclaycard', 'credit-card', 'Statement balance'],
  ['Amex', 'credit-card', 'Statement balance'],
  ['Student Loan', 'loan', 'Plan 2'],
  ['Car Finance', 'loan', 'PCP — 24 months remaining'],
  ['Klarna', 'loan', 'Pay in 3 — furniture'],
  ['Dad', 'person', 'Help with deposit'],
  ['Nadia Rahman', 'person', 'Covered my share of the trip'],
  ['Council Tax', 'bill', 'Arrears — 2 instalments'],
  ['Dentist', 'bill', 'Treatment plan'],
  ['Personal Loan', 'loan', 'Consolidation'],
];

/** Amount profiles by kind, in minor units. */
const AMOUNT_BY_KIND: Record<ObligationKind, { min: number; max: number }> = {
  person: { min: 1500, max: 45_000 },
  'credit-card': { min: 18_000, max: 340_000 },
  loan: { min: 60_000, max: 1_400_000 },
  bill: { min: 4000, max: 120_000 },
  other: { min: 2000, max: 60_000 },
};

/** Most debts are live; a few are already settled or written off. */
const STATE_WEIGHTS = [
  ['outstanding', 78] as const,
  ['settled', 18] as const,
  ['written-off', 4] as const,
];

export interface GenerateObligationsOptions {
  /** How many of each direction to generate. */
  countPerDirection?: number;
  seed?: number;
  /** "Today" for the purposes of due dates. */
  today?: Date;
}

function buildOne(
  rng: Rng,
  direction: ObligationDirection,
  index: number,
  todayMs: number,
): Obligation {
  const source = direction === 'receivable' ? OWED_TO_YOU : YOU_OWE;
  const [counterparty, kind, reference] = source[index % source.length]!;

  const bounds = AMOUNT_BY_KIND[kind];
  const amountMinor = randomInt(rng, bounds.min, bounds.max);

  // Spread due dates either side of today so the list has overdue, due-soon
  // and not-yet-due entries to show.
  const dueOffsetDays = randomInt(rng, -95, 45);
  const issuedOffsetDays = dueOffsetDays - randomInt(rng, 14, 60);

  const state = pickWeighted(rng, STATE_WEIGHTS);
  const amountPaidMinor =
    state === 'settled'
      ? amountMinor
      : state === 'outstanding' && rng() < 0.22
        ? Math.round(amountMinor * (rng() * 0.6 + 0.1))
        : 0;

  return {
    id: `obl_${direction}_${index.toString().padStart(4, '0')}`,
    direction,
    counterparty,
    kind,
    reference,
    amountMinor,
    amountPaidMinor,
    currency: 'GBP',
    issuedOn: new Date(todayMs + issuedOffsetDays * MS_PER_DAY).toISOString().slice(0, 10),
    dueOn: new Date(todayMs + dueOffsetDays * MS_PER_DAY).toISOString().slice(0, 10),
    state,
    notes: '',
    userEntered: false,
  };
}

/**
 * Sample debts in both directions, so a first-time visitor sees a populated
 * dashboard. Deterministic for a given seed, like the transaction generator.
 */
export function generateObligations(options: GenerateObligationsOptions = {}): Obligation[] {
  const { countPerDirection = 9, seed = 8842, today = datasetEndDate() } = options;

  const rng = mulberry32(seed);
  const todayMs = Math.floor(today.getTime() / MS_PER_DAY) * MS_PER_DAY;
  const obligations: Obligation[] = [];

  for (let index = 0; index < countPerDirection; index += 1) {
    obligations.push(buildOne(rng, 'receivable', index, todayMs));
  }
  for (let index = 0; index < countPerDirection; index += 1) {
    obligations.push(buildOne(rng, 'payable', index, todayMs));
  }

  // Soonest due first — the order both ledger tables want by default.
  obligations.sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  return obligations;
}

/** Kept for the "add" form, which offers the same counterparties as hints. */
export function suggestedCounterparties(direction: ObligationDirection): string[] {
  const source = direction === 'receivable' ? OWED_TO_YOU : YOU_OWE;
  return source.map(([counterparty]) => counterparty);
}

