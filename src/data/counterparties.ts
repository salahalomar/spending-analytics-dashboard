import type { Category, ExpenseCategory, IncomeCategory } from '@/types/transaction';

/**
 * Who you tend to pay, and who tends to pay you, per category — plus the
 * profile used to draw amounts. `mean`/`stdDev` are in minor units (pence)
 * and `min`/`max` clamp the tail.
 */
export interface CategoryProfile {
  counterparties: readonly string[];
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  /** Relative likelihood of a transaction landing in this category. */
  weight: number;
}

export const EXPENSE_PROFILES: Record<ExpenseCategory, CategoryProfile> = {
  Groceries: {
    counterparties: ['Tesco', 'Sainsbury’s', 'Aldi', 'Lidl', 'Waitrose', 'Co-op', 'Morrisons'],
    mean: 2800,
    stdDev: 1700,
    min: 180,
    max: 16000,
    weight: 22,
  },
  'Rent & Mortgage': {
    counterparties: ['Landlord', 'Mortgage Payment', 'Ground Rent', 'Service Charge'],
    mean: 118_000,
    stdDev: 32_000,
    min: 20_000,
    max: 320_000,
    weight: 3,
  },
  Utilities: {
    counterparties: [
      'Octopus Energy',
      'Thames Water',
      'British Gas',
      'Virgin Media',
      'EE',
      'Council Tax',
    ],
    mean: 7200,
    stdDev: 3400,
    min: 900,
    max: 34_000,
    weight: 6,
  },
  Transport: {
    counterparties: ['Transport for London', 'Uber', 'Trainline', 'Shell', 'BP', 'Bolt', 'Lime'],
    mean: 800,
    stdDev: 700,
    min: 130,
    max: 14000,
    weight: 20,
  },
  'Eating Out': {
    counterparties: [
      'Pret A Manger',
      'Dishoom',
      'Nando’s',
      'Wagamama',
      'Deliveroo',
      'Honest Burgers',
      'Costa',
    ],
    mean: 1400,
    stdDev: 1100,
    min: 250,
    max: 18000,
    weight: 20,
  },
  Shopping: {
    counterparties: ['Amazon', 'ASOS', 'Zara', 'Uniqlo', 'John Lewis', 'IKEA', 'Apple Store'],
    mean: 3200,
    stdDev: 2900,
    min: 350,
    max: 70000,
    weight: 14,
  },
  Entertainment: {
    counterparties: [
      'Odeon',
      'Ticketmaster',
      'Steam',
      'PlayStation Store',
      'Dice',
      'Everyman Cinema',
    ],
    mean: 1800,
    stdDev: 1400,
    min: 280,
    max: 26000,
    weight: 8,
  },
  'Health & Fitness': {
    counterparties: ['Boots', 'PureGym', 'Superdrug', 'Bupa', 'Third Space', 'Holland & Barrett'],
    mean: 2200,
    stdDev: 1800,
    min: 240,
    max: 28000,
    weight: 7,
  },
  Subscriptions: {
    counterparties: ['Netflix', 'Spotify', 'Disney+', 'iCloud', 'Amazon Prime', 'Adobe', 'Notion'],
    mean: 1180,
    stdDev: 640,
    min: 199,
    max: 6500,
    weight: 7,
  },
  Insurance: {
    counterparties: ['Aviva', 'Direct Line', 'Admiral', 'Vitality', 'Simply Business'],
    mean: 5400,
    stdDev: 3200,
    min: 800,
    max: 48_000,
    weight: 3,
  },
  Travel: {
    counterparties: ['British Airways', 'Ryanair', 'easyJet', 'Booking.com', 'Airbnb', 'Eurostar'],
    mean: 19_000,
    stdDev: 14_500,
    min: 1800,
    max: 245_000,
    weight: 1,
  },
  'Debt Repayments': {
    counterparties: ['Barclaycard', 'Student Loan', 'Car Finance', 'Klarna', 'Personal Loan'],
    mean: 14_500,
    stdDev: 9800,
    min: 1000,
    max: 120_000,
    weight: 3,
  },
  'Other Spending': {
    counterparties: ['Cash Withdrawal', 'Gift', 'Charity', 'Sundry', 'Post Office'],
    mean: 1500,
    stdDev: 1300,
    min: 250,
    max: 40000,
    weight: 8,
  },
};

export const INCOME_PROFILES: Record<IncomeCategory, CategoryProfile> = {
  Salary: {
    counterparties: ['Monthly Salary'],
    mean: 340000,
    stdDev: 22000,
    min: 120000,
    max: 620000,
    weight: 46,
  },
  Freelance: {
    counterparties: ['Harper & Co', 'Northgate Ltd', 'Kestrel Design', 'Private Client'],
    mean: 45000,
    stdDev: 34000,
    min: 5000,
    max: 320000,
    weight: 8,
  },
  Bonus: {
    counterparties: ['Annual Bonus', 'Performance Award', 'Referral Bonus'],
    mean: 145000,
    stdDev: 85000,
    min: 10000,
    max: 800000,
    weight: 1,
  },
  'Interest & Dividends': {
    counterparties: ['Savings Interest', 'ISA Dividend', 'Premium Bonds'],
    mean: 4200,
    stdDev: 3600,
    min: 100,
    max: 46000,
    weight: 20,
  },
  Refunds: {
    counterparties: ['Amazon Refund', 'HMRC Tax Refund', 'Returned Order', 'Utility Credit'],
    mean: 5600,
    stdDev: 5200,
    min: 300,
    max: 88000,
    weight: 22,
  },
  Gifts: {
    counterparties: ['Birthday Gift', 'Family Transfer', 'Christmas Gift'],
    mean: 9500,
    stdDev: 7000,
    min: 1000,
    max: 80000,
    weight: 4,
  },
  'Other Income': {
    counterparties: ['Vinted Sale', 'eBay Sale', 'Cashback', 'Expense Reimbursement'],
    mean: 4800,
    stdDev: 4200,
    min: 200,
    max: 64000,
    weight: 8,
  },
};

export const CATEGORY_PROFILES: Record<Category, CategoryProfile> = {
  ...EXPENSE_PROFILES,
  ...INCOME_PROFILES,
};

/** Short notes appended to a transaction so rows have some texture. */
export const DESCRIPTION_TEMPLATES: readonly string[] = [
  'Card payment',
  'Contactless',
  'Bank transfer',
  'Direct debit',
  'Standing order',
  'Online order',
  'Recurring payment',
  'Split with friends',
];
