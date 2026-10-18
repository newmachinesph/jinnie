import type {
  Bill,
  BudgetLimit,
  Circle,
  CreditTerms,
  Debt,
  FinanceAccount,
  Goal,
  Remittance,
  SharedPool,
  Subscription,
  Transaction,
} from './stores';
import {monthKey} from './utils';

export const DEMO_PREFIX = 'demo-';
export const DEMO_PROFILE = {
  label: 'Reyes household',
  location: 'Quezon City',
} as const;

function daysAgo(now: Date, days: number, hour = 12): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function daysFromNow(now: Date, days: number): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12);
  return date.toISOString().slice(0, 10);
}

function monthsFromNow(now: Date, months: number, day: number): string {
  const date = new Date(now.getFullYear(), now.getMonth() + months, day, 12);
  return date.toISOString().slice(0, 10);
}

function dateInPastMonth(now: Date, monthsBack: number, day: number, hour = 12): string {
  return new Date(now.getFullYear(), now.getMonth() - monthsBack, day, hour).toISOString();
}

export interface DemoData {
  accounts: FinanceAccount[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  bills: Bill[];
  goals: Goal[];
  debts: Debt[];
  remittances: Remittance[];
  circles: Circle[];
  subscriptions: Subscription[];
  creditTerms: CreditTerms[];
  sharedPools: SharedPool[];
}

/**
 * One internally consistent Filipino household snapshot. Stable `demo-` IDs
 * let the shell refresh or remove these rows without touching personal data.
 */
export function createDemoData(now = new Date()): DemoData {
  const updatedAt = daysAgo(now, 0, 9);
  const period = monthKey(now);

  return {
    accounts: [
      {
        id: 'demo-bpi-payroll',
        providerId: 'bpi',
        name: 'BPI Payroll',
        type: 'payroll',
        nature: 'asset',
        currency: 'PHP',
        balance: 62380.2,
        rateToPhp: 1,
        lastFour: '1138',
        updatedAt,
      },
      {
        id: 'demo-gotyme-save',
        providerId: 'gotyme',
        name: 'Go Save · Emergency',
        type: 'savings',
        nature: 'asset',
        currency: 'PHP',
        balance: 38420.6,
        rateToPhp: 1,
        lastFour: '9017',
        updatedAt,
      },
      {
        id: 'demo-wise-usd',
        providerId: 'wise',
        name: 'Wise USD',
        type: 'multicurrency',
        nature: 'asset',
        currency: 'USD',
        balance: 526.84,
        rateToPhp: 57.31,
        updatedAt,
      },
      {
        id: 'demo-bpi-checking',
        providerId: 'bpi',
        name: 'BPI Bills',
        type: 'checking',
        nature: 'asset',
        currency: 'PHP',
        balance: 18750,
        rateToPhp: 1,
        lastFour: '4406',
        updatedAt,
      },
      {
        id: 'demo-gcash-main',
        providerId: 'gcash',
        name: 'GCash Everyday',
        type: 'ewallet',
        nature: 'asset',
        currency: 'PHP',
        balance: 4860.75,
        rateToPhp: 1,
        lastFour: '4821',
        updatedAt,
      },
      {
        id: 'demo-maya-wallet',
        providerId: 'maya-wallet',
        name: 'Maya Wallet',
        type: 'ewallet',
        nature: 'asset',
        currency: 'PHP',
        balance: 2145,
        rateToPhp: 1,
        lastFour: '7734',
        updatedAt,
      },
      {
        id: 'demo-cash',
        providerId: 'cash',
        name: 'Cash on hand',
        type: 'cash',
        nature: 'asset',
        currency: 'PHP',
        balance: 3200,
        rateToPhp: 1,
        updatedAt,
      },
      {
        id: 'demo-bdo-card',
        providerId: 'bdo',
        name: 'BDO Visa Gold',
        type: 'credit_card',
        nature: 'liability',
        currency: 'PHP',
        balance: 12486.32,
        rateToPhp: 1,
        lastFour: '6422',
        creditLimit: 80000,
        updatedAt,
      },
    ],
    transactions: [
      { id: 'demo-txn-grab', type: 'expense', amount: 286, description: 'GrabCar to Ortigas', category: 'transportation', accountId: 'demo-maya-wallet', date: daysAgo(now, 1, 19) },
      { id: 'demo-txn-marketplace', type: 'expense', amount: 2184.35, description: 'The Marketplace groceries', category: 'groceries', accountId: 'demo-gcash-main', date: daysAgo(now, 2, 18) },
      { id: 'demo-txn-salary', type: 'income', amount: 48500, description: 'August salary', category: 'salary', accountId: 'demo-bpi-payroll', date: daysAgo(now, 3, 10) },
      { id: 'demo-txn-meralco', type: 'expense', amount: 3284.17, description: 'Meralco · August bill', category: 'electricity', accountId: 'demo-bpi-checking', billId: 'demo-bill-meralco', billPeriod: period, date: daysAgo(now, 4, 9) },
      { id: 'demo-txn-globe', type: 'expense', amount: 1499, description: 'Globe postpaid', category: 'load_data', accountId: 'demo-maya-wallet', billId: 'demo-bill-globe', billPeriod: period, date: daysAgo(now, 5, 8) },
      { id: 'demo-txn-water', type: 'expense', amount: 684.35, description: 'Manila Water bill', category: 'water', accountId: 'demo-gcash-main', billId: 'demo-bill-water', billPeriod: period, date: daysAgo(now, 7, 9) },
      { id: 'demo-txn-transfer', type: 'transfer', amount: 7500, description: 'Emergency fund top-up', category: 'account_transfer', accountId: 'demo-bpi-payroll', toAccountId: 'demo-gotyme-save', date: daysAgo(now, 7, 18) },
      { id: 'demo-txn-shopee', type: 'expense', amount: 1276.5, description: 'Shopee household order', category: 'shopping', accountId: 'demo-bdo-card', date: daysAgo(now, 6, 21) },
      { id: 'demo-txn-interest', type: 'income', amount: 126.84, description: 'GoTyme savings interest', category: 'interest', accountId: 'demo-gotyme-save', date: daysAgo(now, 8, 8) },
      { id: 'demo-txn-freelance', type: 'income', amount: 14925, description: 'Design project payout', category: 'freelance', accountId: 'demo-bpi-payroll', date: daysAgo(now, 10, 14) },
      { id: 'demo-txn-jollibee', type: 'expense', amount: 428, description: 'Jollibee dinner', category: 'food_dining', accountId: 'demo-gcash-main', date: daysAgo(now, 11, 20) },
      { id: 'demo-txn-watsons', type: 'expense', amount: 683.25, description: 'Watsons essentials', category: 'personal_care', accountId: 'demo-bdo-card', date: daysAgo(now, 13, 17) },
      { id: 'demo-txn-netflix', type: 'expense', amount: 549, description: 'Netflix subscription', category: 'subscriptions', accountId: 'demo-maya-wallet', billId: 'demo-bill-netflix', billPeriod: period, date: daysAgo(now, 15, 8) },
      { id: 'demo-txn-rent', type: 'expense', amount: 16000, description: 'Condo rent', category: 'housing_rent', accountId: 'demo-bpi-checking', date: daysAgo(now, 18, 9) },
      { id: 'demo-txn-family', type: 'expense', amount: 5000, description: 'Support for Nanay', category: 'family_support', accountId: 'demo-gcash-main', date: daysAgo(now, 20, 16) },
      { id: 'demo-txn-coffee', type: 'expense', amount: 190, description: 'Coffee near the office', category: 'food_dining', accountId: 'demo-gcash-main', date: daysAgo(now, 22, 9) },
      { id: 'demo-txn-jul-salary', type: 'income', amount: 48500, description: 'July salary', category: 'salary', accountId: 'demo-bpi-payroll', date: dateInPastMonth(now, 1, 26, 10) },
      { id: 'demo-txn-jul-freelance', type: 'income', amount: 9200, description: 'Brand project balance', category: 'freelance', accountId: 'demo-bpi-payroll', date: dateInPastMonth(now, 1, 18, 14) },
      { id: 'demo-txn-jul-rent', type: 'expense', amount: 16000, description: 'Condo rent', category: 'housing_rent', accountId: 'demo-bpi-checking', date: dateInPastMonth(now, 1, 11, 9) },
      { id: 'demo-txn-jul-groceries', type: 'expense', amount: 6420.8, description: 'July groceries', category: 'groceries', accountId: 'demo-gcash-main', date: dateInPastMonth(now, 1, 20, 18) },
      { id: 'demo-txn-jul-utilities', type: 'expense', amount: 4627.5, description: 'July utilities', category: 'bills_utilities', accountId: 'demo-bpi-checking', date: dateInPastMonth(now, 1, 24, 9) },
      { id: 'demo-txn-jun-salary', type: 'income', amount: 47000, description: 'June salary', category: 'salary', accountId: 'demo-bpi-payroll', date: dateInPastMonth(now, 2, 26, 10) },
      { id: 'demo-txn-jun-rent', type: 'expense', amount: 16000, description: 'Condo rent', category: 'housing_rent', accountId: 'demo-bpi-checking', date: dateInPastMonth(now, 2, 11, 9) },
      { id: 'demo-txn-jun-household', type: 'expense', amount: 11340.25, description: 'June household spending', category: 'groceries', accountId: 'demo-gcash-main', date: dateInPastMonth(now, 2, 19, 18) },
      { id: 'demo-txn-may-salary', type: 'income', amount: 47000, description: 'May salary', category: 'salary', accountId: 'demo-bpi-payroll', date: dateInPastMonth(now, 3, 26, 10) },
      { id: 'demo-txn-may-spend', type: 'expense', amount: 29680.4, description: 'May household spending', category: 'other_expense', accountId: 'demo-bpi-payroll', date: dateInPastMonth(now, 3, 20, 17) },
    ],
    budgets: [
      { id: 'demo-budget-housing', categoryId: 'housing_rent', limit: 18000 },
      { id: 'demo-budget-groceries', categoryId: 'groceries', limit: 7500 },
      { id: 'demo-budget-food', categoryId: 'food_dining', limit: 3200 },
      { id: 'demo-budget-transport', categoryId: 'transportation', limit: 4500 },
      { id: 'demo-budget-electricity', categoryId: 'electricity', limit: 4000 },
      { id: 'demo-budget-family', categoryId: 'family_support', limit: 5000 },
    ],
    bills: [
      { id: 'demo-bill-meralco', name: 'Meralco', billerId: 'meralco', categoryId: 'electricity', paymentAccountId: 'demo-bpi-checking', amount: 3284.17, dueDay: 26, lastPaidPeriod: period, lastPaymentTransactionId: 'demo-txn-meralco' },
      { id: 'demo-bill-water', name: 'Manila Water', billerId: 'manila-water', categoryId: 'water', paymentAccountId: 'demo-gcash-main', amount: 684.35, dueDay: 12, lastPaidPeriod: period, lastPaymentTransactionId: 'demo-txn-water' },
      { id: 'demo-bill-globe', name: 'Globe', billerId: 'globe', categoryId: 'mobile_postpaid', paymentAccountId: 'demo-maya-wallet', amount: 1499, dueDay: 24, lastPaidPeriod: period, lastPaymentTransactionId: 'demo-txn-globe' },
      { id: 'demo-bill-pldt', name: 'PLDT', billerId: 'pldt', categoryId: 'internet_cable', paymentAccountId: 'demo-bpi-checking', amount: 1699, dueDay: 31 },
      { id: 'demo-bill-bdo', name: 'BDO Credit Card', billerId: 'bdo-card', categoryId: 'credit_card', paymentAccountId: 'demo-bpi-payroll', amount: 12486.32, dueDay: 30 },
      { id: 'demo-bill-netflix', name: 'Netflix', billerId: 'netflix', categoryId: 'subscriptions', paymentAccountId: 'demo-maya-wallet', amount: 549, dueDay: 8, lastPaidPeriod: period, lastPaymentTransactionId: 'demo-txn-netflix' },
    ],
    goals: [
      { id: 'demo-goal-emergency', name: '6-month emergency fund', target: 180000, saved: 86500, deadline: monthsFromNow(now, 10, 30) },
      { id: 'demo-goal-laptop', name: 'Laptop upgrade', target: 65000, saved: 27500, deadline: monthsFromNow(now, 4, 15) },
      { id: 'demo-goal-japan', name: 'Japan trip', target: 120000, saved: 14500, deadline: monthsFromNow(now, 8, 10) },
      { id: 'demo-goal-challenge', name: '52-Week Challenge', target: 68900, saved: 32500 },
    ],
    debts: [
      { id: 'demo-debt-carlo', person: 'Carlo', amount: 3500, direction: 'receivable', accountId: 'demo-gcash-main', note: 'Shared Airbnb deposit', date: daysAgo(now, 7) },
      { id: 'demo-debt-mia', person: 'Ate Mia', amount: 8000, direction: 'payable', accountId: 'demo-bpi-payroll', note: 'Tuition advance', date: daysAgo(now, 16) },
      { id: 'demo-debt-nica', person: 'Nica', amount: 1250, direction: 'receivable', accountId: 'demo-maya-wallet', note: 'Concert tickets', date: daysAgo(now, 34), settledAt: daysAgo(now, 12) },
    ],
    remittances: [
      { id: 'demo-remit-ana', direction: 'received', person: 'Ate Ana · Dubai', channel: 'wise', amount: 18500, fee: 0, date: daysAgo(now, 4, 15) },
      { id: 'demo-remit-nanay', direction: 'sent', person: 'Nanay', channel: 'gcash', amount: 5000, fee: 15, date: daysAgo(now, 9, 17) },
      { id: 'demo-remit-client', direction: 'received', person: 'Overseas client', channel: 'payoneer', amount: 22800, fee: 684, date: daysAgo(now, 28, 11) },
      { id: 'demo-remit-joel', direction: 'sent', person: 'Kuya Joel', channel: 'cebuana', amount: 2500, fee: 75, date: daysAgo(now, 41, 13) },
    ],
    circles: [
      { id: 'demo-circle-office', name: 'Office Paluwagan', amount: 2500, members: ['Mika', 'Jo', 'Lea', 'Carlo', 'Bea', 'Sam'], currentRound: 2, frequency: 'monthly' },
      { id: 'demo-circle-christmas', name: 'Barangay Christmas Fund', amount: 500, members: ['Tita Leni', 'Mika', 'Nica', 'Alma', 'Rose'], currentRound: 4, frequency: 'weekly' },
    ],
    subscriptions: [
      { id: 'demo-sub-spotify', name: 'Spotify Premium', billerId: 'spotify', amount: 149, cycle: 'monthly', nextRenewal: daysFromNow(now, 6), paymentAccountId: 'demo-maya-wallet' },
      { id: 'demo-sub-youtube', name: 'YouTube Premium', billerId: 'youtube-premium', amount: 159, cycle: 'monthly', nextRenewal: daysFromNow(now, 27), paymentAccountId: 'demo-gcash-main' },
      { id: 'demo-sub-icloud', name: 'iCloud+ 200GB', amount: 149, cycle: 'monthly', nextRenewal: daysFromNow(now, 1), paymentAccountId: 'demo-bdo-card' },
      { id: 'demo-sub-canva', name: 'Canva Pro', amount: 3990, cycle: 'yearly', nextRenewal: monthsFromNow(now, 5, 14), paymentAccountId: 'demo-bdo-card' },
      { id: 'demo-sub-gym', name: 'Anytime Fitness', amount: 2500, cycle: 'monthly', nextRenewal: monthsFromNow(now, 1, 1), pausedAt: daysAgo(now, 20) },
    ],
    creditTerms: [{accountId: 'demo-bdo-card', statementDay: 5, dueDay: 25, interestRate: 36}],
    sharedPools: [
      {
        id: 'demo-pool-baguio',
        name: 'Baguio long weekend',
        members: ['Me', 'Carlo', 'Nica', 'Bea'],
        expenses: [
          { id: 'demo-pool-baguio-settle', description: 'Bea paid Carlo', amount: 1000, paidBy: 'Bea', splitAmong: ['Carlo'], settlement: true, date: daysAgo(now, 9) },
          { id: 'demo-pool-baguio-dinner', description: 'Dinner at Cafe by the Ruins', amount: 2640, paidBy: 'Nica', splitAmong: ['Me', 'Carlo', 'Nica'], date: daysAgo(now, 11, 20) },
          { id: 'demo-pool-baguio-airbnb', description: 'Airbnb, 2 nights', amount: 8400, paidBy: 'Carlo', splitAmong: ['Me', 'Carlo', 'Nica', 'Bea'], date: daysAgo(now, 12, 15) },
          { id: 'demo-pool-baguio-van', description: 'Van rental', amount: 6000, paidBy: 'Me', splitAmong: ['Me', 'Carlo', 'Nica', 'Bea'], date: daysAgo(now, 12) },
        ],
      },
    ],
  };
}

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}
