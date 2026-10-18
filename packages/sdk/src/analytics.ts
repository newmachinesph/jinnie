export interface InsightTransaction {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  date: string;
}

export interface CashFlowSummary {
  income: number;
  spending: number;
  net: number;
  savingsRate: number;
}

export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function recentPeriods(count: number, now = new Date()): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return periodKey(date);
  });
}

function isPeriod(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  return Number.isFinite(Date.parse(`${value}-01T12:00:00`));
}

/** Recent months plus every valid month represented by the ledger, newest first. */
export function availableInsightPeriods(
  transactions: readonly InsightTransaction[],
  recentCount = 6,
  now = new Date()
): string[] {
  const periods = new Set(recentPeriods(recentCount, now));
  for (const transaction of transactions) {
    const period = transaction.date.slice(0, 7);
    if (isPeriod(period)) periods.add(period);
  }
  return [...periods].sort().reverse();
}

export function transactionsForPeriod(
  transactions: readonly InsightTransaction[],
  period: string
): InsightTransaction[] {
  return transactions.filter((transaction) => transaction.date.startsWith(period));
}

export function summarizeCashFlow(transactions: readonly InsightTransaction[]): CashFlowSummary {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const spending = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const net = income - spending;
  return {
    income,
    spending,
    net,
    savingsRate: income > 0 ? (net / income) * 100 : 0,
  };
}

export function expenseBreakdown(transactions: readonly InsightTransaction[]) {
  const totals = new Map<string, { amount: number; entries: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const current = totals.get(transaction.category) ?? { amount: 0, entries: 0 };
    totals.set(transaction.category, {
      amount: current.amount + transaction.amount,
      entries: current.entries + 1,
    });
  }
  return [...totals.entries()]
    .map(([categoryId, summary]) => ({ categoryId, ...summary }))
    .sort((a, b) => b.amount - a.amount || a.categoryId.localeCompare(b.categoryId));
}
