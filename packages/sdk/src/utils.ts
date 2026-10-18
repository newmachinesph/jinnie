/*
 * Formatting and id helpers shared by every app.
 *
 * Intl is available in Hermes, but a release build with a trimmed ICU can
 * still throw. Money is the one thing this product must never render as
 * `undefined`, so every formatter falls back to a hand-rolled equivalent.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  HKD: 'HK$',
  AED: 'د.إ',
  SAR: '﷼',
  KRW: '₩',
  CNY: 'CN¥',
  THB: '฿',
  MYR: 'RM',
  NZD: 'NZ$',
  CHF: 'CHF',
};

const ZERO_DECIMAL = new Set(['JPY', 'KRW']);

function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function manualMoney(amount: number, currency: string): string {
  const digits = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const negative = amount < 0;
  const fixed = Math.abs(amount).toFixed(digits);
  const [whole, fraction] = fixed.split('.');
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const body = fraction ? `${groupDigits(whole)}.${fraction}` : groupDigits(whole);
  return `${negative ? '-' : ''}${symbol}${body}`;
}

/** Format an amount in its own currency. Falls back if Intl is unavailable. */
export function money(amount: number, currency = 'PHP'): string {
  if (!Number.isFinite(amount)) return manualMoney(0, currency);
  const digits = ZERO_DECIMAL.has(currency) ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return manualMoney(amount, currency);
  }
}

/** Format an amount in the platform's base currency. */
export function peso(amount: number): string {
  return money(amount, 'PHP');
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(iso: string | Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}

/** Render a 'YYYY-MM' period key as a readable month. */
export function formatPeriod(period: string, short = false): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return period;
  const names = short ? MONTHS_SHORT : MONTHS_LONG;
  return short ? names[month - 1] : `${names[month - 1]} ${year}`;
}

export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Current month as 'YYYY-MM'. */
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
