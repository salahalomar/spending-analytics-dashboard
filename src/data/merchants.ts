import type { Category } from '@/types/transaction';

/**
 * Merchant pools per category, plus the spend profile used to draw amounts.
 * `mean`/`stdDev` are in minor units (pence) and `min`/`max` clamp the tail.
 */
export interface CategoryProfile {
  merchants: readonly string[];
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  /** Relative likelihood of a transaction landing in this category. */
  weight: number;
}

export const CATEGORY_PROFILES: Record<Category, CategoryProfile> = {
  Groceries: {
    merchants: ['Tesco', 'Sainsbury’s', 'Waitrose', 'Aldi', 'Lidl', 'Co-op', 'Marks & Spencer', 'Morrisons'],
    mean: 3200,
    stdDev: 1900,
    min: 180,
    max: 18000,
    weight: 22,
  },
  Restaurants: {
    merchants: ['Dishoom', 'Pret A Manger', 'Honest Burgers', 'Wagamama', 'Nando’s', 'Franco Manca', 'Leon', 'Ottolenghi'],
    mean: 2400,
    stdDev: 1600,
    min: 320,
    max: 22000,
    weight: 16,
  },
  Transport: {
    merchants: ['Transport for London', 'Uber', 'Bolt', 'Trainline', 'National Rail', 'Shell', 'BP', 'Lime'],
    mean: 1450,
    stdDev: 1200,
    min: 150,
    max: 16000,
    weight: 15,
  },
  Shopping: {
    merchants: ['Amazon', 'ASOS', 'Zara', 'Uniqlo', 'John Lewis', 'IKEA', 'Apple Store', 'Decathlon'],
    mean: 5400,
    stdDev: 4200,
    min: 400,
    max: 90000,
    weight: 12,
  },
  Entertainment: {
    merchants: ['Odeon', 'Ticketmaster', 'Steam', 'PlayStation Store', 'Barbican', 'Everyman Cinema', 'Dice'],
    mean: 2600,
    stdDev: 1800,
    min: 300,
    max: 30000,
    weight: 7,
  },
  Utilities: {
    merchants: ['Octopus Energy', 'Thames Water', 'British Gas', 'Virgin Media', 'EE', 'Vodafone', 'Hyperoptic'],
    mean: 6800,
    stdDev: 2600,
    min: 900,
    max: 28000,
    weight: 6,
  },
  Health: {
    merchants: ['Boots', 'Superdrug', 'PureGym', 'Bupa', 'Third Space', 'Holland & Barrett'],
    mean: 3600,
    stdDev: 2400,
    min: 250,
    max: 32000,
    weight: 6,
  },
  Travel: {
    merchants: ['British Airways', 'Ryanair', 'easyJet', 'Booking.com', 'Airbnb', 'Eurostar', 'Premier Inn'],
    mean: 18500,
    stdDev: 14000,
    min: 1800,
    max: 240000,
    weight: 4,
  },
  Subscriptions: {
    merchants: ['Netflix', 'Spotify', 'Disney+', 'Adobe', 'GitHub', 'Notion', 'iCloud', 'Figma'],
    mean: 1150,
    stdDev: 620,
    min: 199,
    max: 6000,
    weight: 7,
  },
  Transfers: {
    merchants: ['Savings Vault', 'Rent — Landlord', 'Flatmate Split', 'Investment Pot', 'Family Transfer'],
    mean: 42000,
    stdDev: 26000,
    min: 1000,
    max: 320000,
    weight: 5,
  },
};

/** Short notes appended to a transaction so rows have some texture. */
export const DESCRIPTION_TEMPLATES: readonly string[] = [
  'Contactless payment',
  'Online order',
  'Recurring payment',
  'In-store purchase',
  'Scheduled transfer',
  'Split with friends',
  'Refundable deposit',
  'Auto top-up',
];
