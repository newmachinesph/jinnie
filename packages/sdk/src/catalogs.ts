/**
 * Public, read-only platform catalogs.
 *
 * These definitions are safe for core and community apps to consume. They
 * contain product metadata only — never a user's accounts, balances, or
 * transaction history. Stable ids are persisted; labels may evolve.
 */

import { useMemo } from 'react';
import { useCatalogStore, type UserEntry } from './stores/catalog';

export const CATALOG_VERSION = '2026.08';

export type ProviderKind =
  | 'cash'
  | 'bank'
  | 'digital_bank'
  | 'ewallet'
  | 'international'
  | 'cooperative'
  | 'remittance'
  | 'investment'
  | 'crypto'
  | 'other';

export type AccountType =
  | 'cash'
  | 'ewallet'
  | 'savings'
  | 'checking'
  | 'payroll'
  | 'time_deposit'
  | 'credit_card'
  | 'loan'
  | 'investment'
  | 'multicurrency'
  | 'crypto'
  | 'other';

export type AccountNature = 'asset' | 'liability';
export type CatalogTone = 'emerald' | 'blue' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate';
export type CatalogIcon =
  | 'bank'
  | 'wallet'
  | 'card'
  | 'cash'
  | 'globe'
  | 'send'
  | 'chart'
  | 'food'
  | 'transport'
  | 'home'
  | 'utilities'
  | 'health'
  | 'education'
  | 'government'
  | 'other';

export interface FinancialProvider {
  id: string;
  name: string;
  shortName: string;
  kind: ProviderKind;
  countryCode: string;
  defaultCurrency: string;
  supportedCurrencies: readonly string[];
  accountTypes: readonly AccountType[];
  /** Optional reviewed asset bundled with the app. Never a remote URL. */
  logo?: string;
  /** Two-character fallback displayed when no reviewed logo is available. */
  mark: string;
  tone: CatalogTone;
  aliases?: readonly string[];
}

const PHP = ['PHP'] as const;
const DEPOSIT_TYPES = ['savings', 'checking', 'payroll', 'time_deposit', 'credit_card', 'loan'] as const;

export const financialProviders: readonly FinancialProvider[] = [
  { id: 'cash', name: 'Cash on hand', shortName: 'Cash', kind: 'cash', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: [], accountTypes: ['cash'], mark: '₱', tone: 'emerald' },

  // E-wallets and payment accounts
  { id: 'gcash', name: 'GCash', shortName: 'GCash', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'GC', tone: 'blue' },
  { id: 'maya-wallet', name: 'Maya Wallet', shortName: 'Maya', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'MY', tone: 'emerald' },
  { id: 'grabpay', name: 'GrabPay', shortName: 'GrabPay', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'GP', tone: 'emerald' },
  { id: 'shopeepay', name: 'ShopeePay', shortName: 'ShopeePay', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'SP', tone: 'rose' },
  { id: 'palawanpay', name: 'PalawanPay', shortName: 'PalawanPay', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'PP', tone: 'amber' },
  { id: 'coins-ph', name: 'Coins.ph', shortName: 'Coins.ph', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet', 'crypto'], mark: 'CP', tone: 'amber' },
  { id: 'bayad', name: 'Bayad', shortName: 'Bayad', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'BY', tone: 'blue' },
  { id: 'starpay', name: 'StarPay', shortName: 'StarPay', kind: 'ewallet', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet'], mark: 'ST', tone: 'blue' },
  { id: 'ussc', name: 'USSC', shortName: 'USSC', kind: 'remittance', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['ewallet', 'other'], mark: 'US', tone: 'blue' },
  { id: 'cebuana', name: 'Cebuana Lhuillier', shortName: 'Cebuana', kind: 'remittance', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'ewallet', 'other'], mark: 'CL', tone: 'blue' },
  { id: 'lulu-money', name: 'LuLu Money', shortName: 'LuLu Money', kind: 'remittance', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: [], accountTypes: ['other'], mark: 'LM', tone: 'violet' },

  // BSP digital banks
  { id: 'gotyme', name: 'GoTyme Bank', shortName: 'GoTyme', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings'], mark: 'GT', tone: 'violet' },
  { id: 'maya-bank', name: 'Maya Bank', shortName: 'Maya Bank', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'loan'], mark: 'MB', tone: 'emerald' },
  { id: 'tonik', name: 'Tonik Digital Bank', shortName: 'Tonik', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'time_deposit', 'loan'], mark: 'TK', tone: 'violet' },
  { id: 'uniondigital', name: 'UnionDigital Bank', shortName: 'UnionDigital', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'time_deposit', 'loan'], mark: 'UD', tone: 'amber' },
  { id: 'uno', name: 'UNO Digital Bank', shortName: 'UNO', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'time_deposit', 'loan'], mark: 'UN', tone: 'blue' },
  { id: 'maribank', name: 'MariBank Philippines', shortName: 'MariBank', kind: 'digital_bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings'], mark: 'MR', tone: 'rose', aliases: ['SeaBank'] },

  // Digital-first and traditional Philippine banks
  { id: 'cimb-ph', name: 'CIMB Bank Philippines', shortName: 'CIMB', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'loan'], mark: 'CI', tone: 'rose' },
  { id: 'ownbank', name: 'OwnBank', shortName: 'OwnBank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'time_deposit'], mark: 'OW', tone: 'blue' },
  { id: 'netbank', name: 'Netbank', shortName: 'Netbank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings'], mark: 'NB', tone: 'emerald' },
  { id: 'bpi', name: 'Bank of the Philippine Islands', shortName: 'BPI', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'BPI', tone: 'rose' },
  { id: 'bdo', name: 'BDO Unibank', shortName: 'BDO', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'BD', tone: 'blue' },
  { id: 'metrobank', name: 'Metropolitan Bank & Trust Company', shortName: 'Metrobank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'MT', tone: 'blue' },
  { id: 'unionbank', name: 'Union Bank of the Philippines', shortName: 'UnionBank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'UB', tone: 'amber' },
  { id: 'rcbc', name: 'Rizal Commercial Banking Corporation', shortName: 'RCBC', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'RC', tone: 'blue' },
  { id: 'security-bank', name: 'Security Bank', shortName: 'Security Bank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'SB', tone: 'blue' },
  { id: 'landbank', name: 'Land Bank of the Philippines', shortName: 'LANDBANK', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'LB', tone: 'emerald' },
  { id: 'pnb', name: 'Philippine National Bank', shortName: 'PNB', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'PN', tone: 'blue' },
  { id: 'eastwest', name: 'East West Banking Corporation', shortName: 'EastWest', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'EW', tone: 'violet' },
  { id: 'chinabank', name: 'China Banking Corporation', shortName: 'Chinabank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'CB', tone: 'rose' },
  { id: 'aub', name: 'Asia United Bank', shortName: 'AUB', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'AU', tone: 'rose' },
  { id: 'maybank-ph', name: 'Maybank Philippines', shortName: 'Maybank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'MY', tone: 'amber' },
  { id: 'psbank', name: 'Philippine Savings Bank', shortName: 'PSBank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'checking', 'credit_card', 'loan'], mark: 'PS', tone: 'blue' },
  { id: 'dbp', name: 'Development Bank of the Philippines', shortName: 'DBP', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'DB', tone: 'blue' },
  { id: 'bankcom', name: 'Bank of Commerce', shortName: 'BankCom', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'BC', tone: 'blue' },
  { id: 'pbcom', name: 'Philippine Bank of Communications', shortName: 'PBCOM', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'PB', tone: 'blue' },
  { id: 'philtrust', name: 'Philippine Trust Company', shortName: 'Philtrust', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'PT', tone: 'blue' },
  { id: 'veterans-bank', name: 'Philippine Veterans Bank', shortName: 'Veterans Bank', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'checking', 'payroll', 'loan'], mark: 'VB', tone: 'emerald' },
  { id: 'ctbc-ph', name: 'CTBC Bank Philippines', shortName: 'CTBC', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: DEPOSIT_TYPES, mark: 'CT', tone: 'blue' },
  { id: 'hsbc-ph', name: 'HSBC Philippines', shortName: 'HSBC', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: ['savings', 'credit_card'], mark: 'HS', tone: 'rose' },
  { id: 'standard-chartered-ph', name: 'Standard Chartered Philippines', shortName: 'Standard Chartered', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: ['PHP', 'USD'], accountTypes: ['savings', 'credit_card'], mark: 'SC', tone: 'emerald' },
  { id: 'bdo-network', name: 'BDO Network Bank', shortName: 'BDO Network', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'payroll', 'loan'], mark: 'BN', tone: 'blue' },
  { id: 'bpi-banko', name: 'BPI Direct BanKo', shortName: 'BanKo', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'loan'], mark: 'BK', tone: 'rose' },
  { id: 'chinabank-savings', name: 'China Bank Savings', shortName: 'CBS', kind: 'bank', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'checking', 'loan'], mark: 'CS', tone: 'rose' },

  // International and multi-currency accounts
  { id: 'wise', name: 'Wise', shortName: 'Wise', kind: 'international', countryCode: 'GB', defaultCurrency: 'PHP', supportedCurrencies: [], accountTypes: ['multicurrency'], mark: 'WI', tone: 'emerald' },
  { id: 'paypal', name: 'PayPal', shortName: 'PayPal', kind: 'international', countryCode: 'US', defaultCurrency: 'USD', supportedCurrencies: [], accountTypes: ['multicurrency'], mark: 'PP', tone: 'blue' },
  { id: 'payoneer', name: 'Payoneer', shortName: 'Payoneer', kind: 'international', countryCode: 'US', defaultCurrency: 'USD', supportedCurrencies: [], accountTypes: ['multicurrency'], mark: 'PY', tone: 'amber' },

  // Investment and virtual-asset accounts
  { id: 'col-financial', name: 'COL Financial', shortName: 'COL', kind: 'investment', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['investment'], mark: 'CL', tone: 'blue' },
  { id: 'firstmetrosec', name: 'FirstMetroSec', shortName: 'FirstMetroSec', kind: 'investment', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['investment'], mark: 'FM', tone: 'blue' },
  { id: 'bdo-securities', name: 'BDO Securities', shortName: 'BDO Securities', kind: 'investment', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['investment'], mark: 'BS', tone: 'blue' },
  { id: 'bpi-trade', name: 'BPI Trade', shortName: 'BPI Trade', kind: 'investment', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['investment'], mark: 'BT', tone: 'rose' },
  { id: 'dragonfi', name: 'DragonFi', shortName: 'DragonFi', kind: 'investment', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['investment'], mark: 'DF', tone: 'rose' },
  { id: 'pdax', name: 'Philippine Digital Asset Exchange', shortName: 'PDAX', kind: 'crypto', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['crypto'], mark: 'PX', tone: 'blue' },

  { id: 'cooperative', name: 'Cooperative or credit union', shortName: 'Cooperative', kind: 'cooperative', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: PHP, accountTypes: ['savings', 'loan', 'other'], mark: 'CO', tone: 'emerald' },
  { id: 'custom', name: 'Other institution', shortName: 'Other', kind: 'other', countryCode: 'PH', defaultCurrency: 'PHP', supportedCurrencies: [], accountTypes: ['savings', 'checking', 'credit_card', 'loan', 'investment', 'other'], mark: '+', tone: 'slate' },
];

export const providerKindLabels: Record<ProviderKind, string> = {
  cash: 'Cash',
  ewallet: 'E-wallets',
  digital_bank: 'Digital banks',
  bank: 'Banks',
  international: 'International',
  cooperative: 'Cooperatives',
  remittance: 'Remittance',
  investment: 'Investments',
  crypto: 'Virtual assets',
  other: 'Other',
};

export const accountTypes: readonly { id: AccountType; label: string; nature: AccountNature }[] = [
  { id: 'cash', label: 'Cash', nature: 'asset' },
  { id: 'ewallet', label: 'E-wallet', nature: 'asset' },
  { id: 'savings', label: 'Savings', nature: 'asset' },
  { id: 'checking', label: 'Checking', nature: 'asset' },
  { id: 'payroll', label: 'Payroll', nature: 'asset' },
  { id: 'time_deposit', label: 'Time deposit', nature: 'asset' },
  { id: 'credit_card', label: 'Credit card', nature: 'liability' },
  { id: 'loan', label: 'Loan', nature: 'liability' },
  { id: 'investment', label: 'Investment', nature: 'asset' },
  { id: 'multicurrency', label: 'Multi-currency balance', nature: 'asset' },
  { id: 'crypto', label: 'Virtual asset', nature: 'asset' },
  { id: 'other', label: 'Other account', nature: 'asset' },
];

export const currencies: readonly { code: string; name: string; symbol: string }[] = [
  { code: 'PHP', name: 'Philippine peso', symbol: '₱' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British pound', symbol: '£' },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'C$' },
  { code: 'HKD', name: 'Hong Kong dollar', symbol: 'HK$' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi riyal', symbol: '﷼' },
  { code: 'KRW', name: 'South Korean won', symbol: '₩' },
  { code: 'CNY', name: 'Chinese yuan', symbol: 'CN¥' },
  { code: 'THB', name: 'Thai baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM' },
  { code: 'NZD', name: 'New Zealand dollar', symbol: 'NZ$' },
  { code: 'CHF', name: 'Swiss franc', symbol: 'CHF' },
];

export type TransactionCategoryGroup = 'expense' | 'income' | 'transfer';

export interface TransactionCategory {
  id: string;
  label: string;
  group: TransactionCategoryGroup;
  icon: CatalogIcon;
}

export const transactionCategories: readonly TransactionCategory[] = [
  { id: 'food_dining', label: 'Food & Dining', group: 'expense', icon: 'food' },
  { id: 'groceries', label: 'Groceries', group: 'expense', icon: 'food' },
  { id: 'transportation', label: 'Transportation', group: 'expense', icon: 'transport' },
  { id: 'load_data', label: 'Load & Data', group: 'expense', icon: 'utilities' },
  { id: 'housing_rent', label: 'Housing & Rent', group: 'expense', icon: 'home' },
  { id: 'bills_utilities', label: 'Bills & Utilities', group: 'expense', icon: 'utilities' },
  { id: 'electricity', label: 'Electricity', group: 'expense', icon: 'utilities' },
  { id: 'water', label: 'Water', group: 'expense', icon: 'utilities' },
  { id: 'internet_cable', label: 'Internet & Cable', group: 'expense', icon: 'utilities' },
  { id: 'health', label: 'Health', group: 'expense', icon: 'health' },
  { id: 'education', label: 'Education', group: 'expense', icon: 'education' },
  { id: 'insurance', label: 'Insurance', group: 'expense', icon: 'card' },
  { id: 'subscriptions', label: 'Subscriptions', group: 'expense', icon: 'card' },
  { id: 'shopping', label: 'Shopping', group: 'expense', icon: 'card' },
  { id: 'personal_care', label: 'Personal Care', group: 'expense', icon: 'other' },
  { id: 'leisure', label: 'Leisure', group: 'expense', icon: 'other' },
  { id: 'remittance', label: 'Remittance', group: 'expense', icon: 'send' },
  { id: 'debt_payment', label: 'Debt Payment', group: 'expense', icon: 'card' },
  { id: 'credit_card_payment', label: 'Credit Card Payment', group: 'expense', icon: 'card' },
  { id: 'government', label: 'Government Contributions', group: 'expense', icon: 'government' },
  { id: 'family_support', label: 'Family Support', group: 'expense', icon: 'send' },
  { id: 'gifts_donations', label: 'Gifts & Donations', group: 'expense', icon: 'other' },
  { id: 'fees_charges', label: 'Fees & Charges', group: 'expense', icon: 'card' },
  { id: 'taxes', label: 'Taxes', group: 'expense', icon: 'government' },
  { id: 'other_expense', label: 'Other Expense', group: 'expense', icon: 'other' },
  { id: 'salary', label: 'Salary', group: 'income', icon: 'cash' },
  { id: 'business', label: 'Business', group: 'income', icon: 'chart' },
  { id: 'freelance', label: 'Freelance', group: 'income', icon: 'chart' },
  { id: 'remittance_income', label: 'Remittance Received', group: 'income', icon: 'send' },
  { id: 'allowance', label: 'Allowance', group: 'income', icon: 'cash' },
  { id: 'interest', label: 'Interest', group: 'income', icon: 'bank' },
  { id: 'investment_income', label: 'Investment Income', group: 'income', icon: 'chart' },
  { id: 'refund', label: 'Refund', group: 'income', icon: 'cash' },
  { id: 'sale', label: 'Sale', group: 'income', icon: 'cash' },
  { id: 'gifts_received', label: 'Gift Received', group: 'income', icon: 'cash' },
  { id: 'debt_repayment', label: 'Debt Repaid', group: 'income', icon: 'cash' },
  { id: 'other_income', label: 'Other Income', group: 'income', icon: 'other' },
  { id: 'account_transfer', label: 'Account Transfer', group: 'transfer', icon: 'send' },
];

export interface BillerCategory {
  id: string;
  label: string;
  transactionCategoryId: string;
  icon: CatalogIcon;
}

export const billerCategories: readonly BillerCategory[] = [
  { id: 'electricity', label: 'Electricity', transactionCategoryId: 'electricity', icon: 'utilities' },
  { id: 'water', label: 'Water', transactionCategoryId: 'water', icon: 'utilities' },
  { id: 'internet_cable', label: 'Internet & Cable', transactionCategoryId: 'internet_cable', icon: 'utilities' },
  { id: 'mobile_postpaid', label: 'Mobile Postpaid', transactionCategoryId: 'load_data', icon: 'utilities' },
  { id: 'rent', label: 'Rent', transactionCategoryId: 'housing_rent', icon: 'home' },
  { id: 'credit_card', label: 'Credit Card', transactionCategoryId: 'credit_card_payment', icon: 'card' },
  { id: 'loan', label: 'Loan', transactionCategoryId: 'debt_payment', icon: 'card' },
  { id: 'insurance', label: 'Insurance', transactionCategoryId: 'insurance', icon: 'card' },
  { id: 'education', label: 'Education', transactionCategoryId: 'education', icon: 'education' },
  { id: 'government', label: 'Government', transactionCategoryId: 'government', icon: 'government' },
  { id: 'subscriptions', label: 'Subscriptions', transactionCategoryId: 'subscriptions', icon: 'card' },
  { id: 'other', label: 'Other bill', transactionCategoryId: 'bills_utilities', icon: 'other' },
];

export interface BillerDefinition {
  id: string;
  name: string;
  categoryId: string;
  mark: string;
  tone: CatalogTone;
}

export const billers: readonly BillerDefinition[] = [
  { id: 'meralco', name: 'Meralco', categoryId: 'electricity', mark: 'ME', tone: 'amber' },
  { id: 'visayan-electric', name: 'Visayan Electric', categoryId: 'electricity', mark: 'VE', tone: 'amber' },
  { id: 'davao-light', name: 'Davao Light', categoryId: 'electricity', mark: 'DL', tone: 'amber' },
  { id: 'electric-cooperative', name: 'Local electric cooperative', categoryId: 'electricity', mark: 'EC', tone: 'amber' },
  { id: 'maynilad', name: 'Maynilad', categoryId: 'water', mark: 'MW', tone: 'sky' },
  { id: 'manila-water', name: 'Manila Water', categoryId: 'water', mark: 'MW', tone: 'sky' },
  { id: 'water-district', name: 'Local water district', categoryId: 'water', mark: 'WD', tone: 'sky' },
  { id: 'pldt', name: 'PLDT', categoryId: 'internet_cable', mark: 'PL', tone: 'rose' },
  { id: 'converge', name: 'Converge ICT', categoryId: 'internet_cable', mark: 'CV', tone: 'violet' },
  { id: 'sky', name: 'SKY', categoryId: 'internet_cable', mark: 'SK', tone: 'blue' },
  { id: 'globe', name: 'Globe', categoryId: 'mobile_postpaid', mark: 'GL', tone: 'blue' },
  { id: 'smart', name: 'Smart', categoryId: 'mobile_postpaid', mark: 'SM', tone: 'emerald' },
  { id: 'dito', name: 'DITO', categoryId: 'mobile_postpaid', mark: 'DT', tone: 'rose' },
  { id: 'bpi-card', name: 'BPI Credit Card', categoryId: 'credit_card', mark: 'BP', tone: 'rose' },
  { id: 'bdo-card', name: 'BDO Credit Card', categoryId: 'credit_card', mark: 'BD', tone: 'blue' },
  { id: 'metrobank-card', name: 'Metrobank Credit Card', categoryId: 'credit_card', mark: 'MT', tone: 'blue' },
  { id: 'unionbank-card', name: 'UnionBank Credit Card', categoryId: 'credit_card', mark: 'UB', tone: 'amber' },
  { id: 'rcbc-card', name: 'RCBC Credit Card', categoryId: 'credit_card', mark: 'RC', tone: 'blue' },
  { id: 'security-bank-card', name: 'Security Bank Credit Card', categoryId: 'credit_card', mark: 'SB', tone: 'blue' },
  { id: 'eastwest-card', name: 'EastWest Credit Card', categoryId: 'credit_card', mark: 'EW', tone: 'violet' },
  { id: 'home-credit', name: 'Home Credit', categoryId: 'loan', mark: 'HC', tone: 'rose' },
  { id: 'sss', name: 'SSS', categoryId: 'government', mark: 'SS', tone: 'blue' },
  { id: 'pagibig', name: 'Pag-IBIG Fund', categoryId: 'government', mark: 'PI', tone: 'rose' },
  { id: 'philhealth', name: 'PhilHealth', categoryId: 'government', mark: 'PH', tone: 'emerald' },
  { id: 'netflix', name: 'Netflix', categoryId: 'subscriptions', mark: 'N', tone: 'rose' },
  { id: 'spotify', name: 'Spotify', categoryId: 'subscriptions', mark: 'SP', tone: 'emerald' },
  { id: 'disney-plus', name: 'Disney+', categoryId: 'subscriptions', mark: 'D+', tone: 'blue' },
  { id: 'youtube-premium', name: 'YouTube Premium', categoryId: 'subscriptions', mark: 'YT', tone: 'rose' },
  { id: 'custom', name: 'Other biller', categoryId: 'other', mark: '+', tone: 'slate' },
];

export const catalogs = {
  version: CATALOG_VERSION,
  providers: financialProviders,
  accountTypes,
  currencies,
  transactionCategories,
  billerCategories,
  billers,
} as const;

// -- User additions -----------------------------------------------------
//
// Anything the user typed in because the built-in list lacked it lives in
// the catalog store and is shaped into the same records as the built-ins,
// so every lookup and picker treats both alike.

/** Two-character fallback mark: initials of the first two words. */
export function monogram(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const mark = words.length >= 2 ? words[0][0] + words[1][0] : label.trim().slice(0, 2);
  return mark.toUpperCase() || '?';
}

function userCategory(entry: UserEntry): TransactionCategory {
  return { id: entry.id, label: entry.label, group: entry.group ?? 'expense', icon: 'other' };
}

function userProvider(entry: UserEntry): FinancialProvider {
  return {
    id: entry.id,
    name: entry.label,
    shortName: entry.label,
    kind: 'other',
    countryCode: 'PH',
    defaultCurrency: 'PHP',
    supportedCurrencies: [],
    accountTypes: ['savings', 'checking', 'credit_card', 'loan', 'investment', 'other'],
    mark: monogram(entry.label),
    tone: 'slate',
  };
}

function userBiller(entry: UserEntry): BillerDefinition {
  return {
    id: entry.id,
    name: entry.label,
    categoryId: entry.categoryId ?? 'other',
    mark: monogram(entry.label),
    tone: 'slate',
  };
}

function userEntries(kind: UserEntry['kind']): UserEntry[] {
  return useCatalogStore.getState().entries.filter((entry) => entry.kind === kind);
}

/** Built-ins plus the user's own categories; reactive, for pickers. */
export function useTransactionCategories(group?: TransactionCategoryGroup): TransactionCategory[] {
  const entries = useCatalogStore((state) => state.entries);
  return useMemo(() => {
    const all = [
      ...transactionCategories,
      ...entries.filter((entry) => entry.kind === 'category').map(userCategory),
    ];
    return group ? all.filter((category) => category.group === group) : all;
  }, [entries, group]);
}

export function useFinancialProviders(): FinancialProvider[] {
  const entries = useCatalogStore((state) => state.entries);
  return useMemo(
    () => [
      ...financialProviders,
      ...entries.filter((entry) => entry.kind === 'institution').map(userProvider),
    ],
    [entries],
  );
}

export function useBillers(): BillerDefinition[] {
  const entries = useCatalogStore((state) => state.entries);
  return useMemo(
    () => [...billers, ...entries.filter((entry) => entry.kind === 'biller').map(userBiller)],
    [entries],
  );
}

export function getProvider(id: string): FinancialProvider | undefined {
  return (
    financialProviders.find((provider) => provider.id === id) ??
    userEntries('institution')
      .filter((entry) => entry.id === id)
      .map(userProvider)[0]
  );
}

export function getAccountType(id: string) {
  return accountTypes.find((type) => type.id === id);
}

export function getTransactionCategory(id: string): TransactionCategory | undefined {
  return (
    transactionCategories.find((category) => category.id === id) ??
    userEntries('category')
      .filter((entry) => entry.id === id)
      .map(userCategory)[0]
  );
}

export function getBiller(id: string): BillerDefinition | undefined {
  return (
    billers.find((biller) => biller.id === id) ??
    userEntries('biller')
      .filter((entry) => entry.id === id)
      .map(userBiller)[0]
  );
}

