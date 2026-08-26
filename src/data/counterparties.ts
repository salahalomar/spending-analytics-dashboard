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
    mean: 3400,
    stdDev: 2100,
    min: 180,
    max: 19_000,
    weight: 20,
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
    counterparties: ['Octopus Energy', 'Thames Water', 'British Gas', 'Virgin Media', 'EE', 'Council Tax'],
    mean: 7200,
    stdDev: 3400,
    min: 900,
    max: 34_000,
    weight: 6,
  },
  Transport: {
    counterparties: ['Transport for London', 'Uber', 'Trainline', 'Shell', 'BP', 'Bolt', 'Lime'],
    mean: 1550,
    stdDev: 1300,
    min: 150,
    max: 18_000,
    weight: 14,
  },
  'Eating Out': {
    counterparties: ['Pret A Manger', 'Dishoom', 'Nando’s', 'Wagamama', 'Deliveroo', 'Honest Burgers', 'Costa'],
    mean: 2500,
    stdDev: 1700,
    min: 320,
    max: 24_000,
    weight: 15,
  },
  Shopping: {
    counterparties: ['Amazon', 'ASOS', 'Zara', 'Uniqlo', 'John Lewis', 'IKEA', 'Apple Store'],
    mean: 5600,
    stdDev: 4400,
    min: 400,
    max: 92_000,
    weight: 11,
  },
  Entertainment: {
    counterparties: ['Odeon', 'Ticketmaster', 'Steam', 'PlayStation Store', 'Dice', 'Everyman Cinema'],
    mean: 2700,
    stdDev: 1900,
    min: 300,
    max: 32_000,
    weight: 6,
  },
  'Health & Fitness': {
    counterparties: ['Boots', 'PureGym', 'Superdrug', 'Bupa', 'Third Space', 'Holland & Barrett'],
    mean: 3700,
    stdDev: 2500,
    min: 250,
    max: 34_000,
    weight: 6,
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
    weight: 3,
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
    mean: 4200,
    stdDev: 3600,
    min: 300,
    max: 60_000,
    weight: 3,
  },
};

export const INCOME_PROFILES: Record<IncomeCategory, CategoryProfile> = {
  Salary: {
    counterparties: ['Monthly Salary'],
    mean: 285_000,
    stdDev: 18_000,
    min: 120_000,
    max: 520_000,
    weight: 46,
  },
  Freelance: {
    counterparties: ['Harper & Co', 'Northgate Ltd', 'Kestrel Design', 'Private Client'],
    mean: 62_000,
    stdDev: 44_000,
    min: 5000,
    max: 420_000,
    weight: 22,
  },
  Bonus: {
    counterparties: ['Annual Bonus', 'Performance Award', 'Referral Bonus'],
    mean: 145_000,
    stdDev: 85_000,
    min: 10_000,
    max: 800_000,
    weight: 4,
  },
  'Interest & Dividends': {
    counterparties: ['Savings Interest', 'ISA Dividend', 'Premium Bonds'],
    mean: 4200,
    stdDev: 3600,
    min: 100,
    max: 46_000,
    weight: 12,
  },
  Refunds: {
    counterparties: ['Amazon Refund', 'HMRC Tax Refund', 'Returned Order', 'Utility Credit'],
    mean: 5600,
    stdDev: 5200,
    min: 300,
    max: 88_000,
    weight: 10,
  },
  Gifts: {
    counterparties: ['Birthday Gift', 'Family Transfer', 'Christmas Gift'],
    mean: 9500,
    stdDev: 7000,
    min: 1000,
    max: 80_000,
    weight: 3,
  },
  'Other Income': {
    counterparties: ['Vinted Sale', 'eBay Sale', 'Cashback', 'Expense Reimbursement'],
    mean: 4800,
    stdDev: 4200,
    min: 200,
    max: 64_000,
    weight: 3,
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
