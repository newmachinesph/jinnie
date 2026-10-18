/** Display formatting never changes the numeric value delivered to a form. */
export function formatInputNumber(value: string): string {
  if (!/^-?\d*(?:\.\d*)?$/.test(value)) return value;
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}

export function parseInputNumber(value: string): number {
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return NaN;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) < 1e12 ? number : NaN;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type NumberInputRules = {decimals?: number; signed?: boolean; integer?: boolean};

/** Reject malformed pasted grouping, exponent notation, and excess precision. */
export function numericEdit(text: string, rules: NumberInputRules = {}): string | null {
  if (text.includes(',') && !/^-?\d{1,3}(?:,\d{3})*(?:\.\d*)?$/.test(text)) return null;
  const raw = text.replace(/,/g, '');
  const decimals = rules.integer ? 0 : (rules.decimals ?? 2);
  const pattern = new RegExp(`^${rules.signed ? '-?' : ''}\\d*${decimals ? `(?:\\.\\d{0,${decimals}})?` : ''}$`);
  if (!pattern.test(raw) || raw.replace(/^-/, '').split('.')[0].length > 12) return null;
  return raw;
}
