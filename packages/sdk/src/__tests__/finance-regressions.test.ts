import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import {
  availableInsightPeriods,
  expenseBreakdown,
  summarizeCashFlow,
  transactionsForPeriod,
  type InsightTransaction,
} from '../analytics';
import {accountValueInPhp, useAccountsStore, type FinanceAccount} from '../stores/accounts';
import {useBillsStore} from '../stores/bills';
import {useBudgetStore} from '../stores/budget';
import {useWalletStore} from '../stores/wallet';
import {useGoalsStore} from '../stores/goals';
import {useDebtsStore} from '../stores/debts';
import {useCirclesStore} from '../stores/circles';
import {useRemitStore} from '../stores/remit';
import {monthlyCost, nextRenewalAfter, useSubscriptionsStore} from '../stores/subscriptions';
import {daysUntilDay, useCreditStore, utilisation} from '../stores/credit';
import {poolBalances, settlementPlan, useSharedStore} from '../stores/shared';
import {useProfileStore} from '../stores/profile';
import {useCatalogStore} from '../stores/catalog';
import {getBiller, getProvider, getTransactionCategory, monogram} from '../catalogs';
import {resetAllStores} from '../stores';
import {financeActions} from '../finance-actions';
import {createBackup, decryptBackup, encryptBackup, parseBackupText, readBackup, restoreBackup} from '../backup';
import {appLock, validPin} from '../app-lock';
import {money, peso, formatPeriod} from '../utils';

const activity: InsightTransaction[] = [
  {type: 'income', amount: 50_000, category: 'salary', date: '2026-08-01T08:00:00.000Z'},
  {type: 'expense', amount: 5_000, category: 'food_dining', date: '2026-08-02T08:00:00.000Z'},
  {type: 'expense', amount: 2_000, category: 'food_dining', date: '2026-08-03T08:00:00.000Z'},
  {type: 'expense', amount: 3_000, category: 'transportation', date: '2026-08-04T08:00:00.000Z'},
  {type: 'transfer', amount: 10_000, category: 'account_transfer', date: '2026-08-05T08:00:00.000Z'},
  {type: 'income', amount: 1_000, category: 'food_dining', date: '2025-01-01T08:00:00.000Z'},
];

beforeEach(() => {
  useAccountsStore.setState({accounts: [], baseCurrency: 'PHP'});
  useWalletStore.setState({transactions: []});
  useBillsStore.setState({bills: []});
  useBudgetStore.setState({limits: []});
  useGoalsStore.setState({goals: []});
  useDebtsStore.setState({debts: []});
  useSubscriptionsStore.setState({subscriptions: []});
  useCreditStore.setState({terms: []});
  useSharedStore.setState({pools: []});
  useCirclesStore.setState({circles: []});
  useRemitStore.setState({entries: []});
  useProfileStore.setState({name: ''});
  useCatalogStore.setState({entries: []});
});

describe('User catalog entries', () => {
  it('saves a typed-in entry once and resolves it like a built-in', () => {
    const catalog = useCatalogStore.getState();
    const id = catalog.addEntry({kind: 'category', label: '  Pet care ', group: 'expense'});
    assert.ok(id.startsWith('user-category-'));
    assert.equal(catalog.addEntry({kind: 'category', label: 'pet CARE', group: 'expense'}), id);
    assert.notEqual(catalog.addEntry({kind: 'category', label: 'Pet care', group: 'income'}), id);
    assert.equal(catalog.addEntry({kind: 'category', label: '   ', group: 'expense'}), '');
    assert.deepEqual(getTransactionCategory(id), {id, label: 'Pet care', group: 'expense', icon: 'other'});

    const bank = catalog.addEntry({kind: 'institution', label: 'Barangay Coop Bank'});
    assert.equal(getProvider(bank)?.shortName, 'Barangay Coop Bank');
    assert.equal(getProvider(bank)?.mark, 'BC');
    const biller = catalog.addEntry({kind: 'biller', label: 'Condo dues', categoryId: 'rent'});
    assert.equal(getBiller(biller)?.categoryId, 'rent');
    assert.equal(getTransactionCategory('salary')?.label, 'Salary');

    catalog.renameEntry(id, '  Pets ');
    assert.equal(getTransactionCategory(id)?.label, 'Pets');
    catalog.renameEntry(id, ' ');
    assert.equal(getTransactionCategory(id)?.label, 'Pets');
    catalog.removeEntry(id);
    assert.equal(getTransactionCategory(id), undefined);
    assert.equal(monogram('x'), 'X');
  });
});

describe('Profile', () => {
  it('keeps a trimmed, bounded name and ignores blank input', async () => {
    const profile = useProfileStore.getState();
    profile.setName('   ');
    assert.equal(useProfileStore.getState().name, '');
    profile.setName('  Lino  ');
    assert.equal(useProfileStore.getState().name, 'Lino');
    profile.setName('x'.repeat(100));
    assert.equal(useProfileStore.getState().name.length, 40);
    profile.setName('');
    assert.equal(useProfileStore.getState().name.length, 40);
    await resetAllStores();
    assert.equal(useProfileStore.getState().name, '');
  });
});

describe('Insights analytics', () => {
  it('keeps historical ledger months available beyond the recent window', () => {
    const periods = availableInsightPeriods(activity, 2, new Date(2026, 7, 29));
    assert.deepEqual(periods, ['2026-08', '2026-07', '2025-01']);
  });

  it('treats transfers as cash-flow neutral', () => {
    const summary = summarizeCashFlow(transactionsForPeriod(activity, '2026-08'));
    assert.deepEqual(summary, {income: 50_000, spending: 10_000, net: 40_000, savingsRate: 80});
  });

  it('counts only expense entries in category rankings', () => {
    const breakdown = expenseBreakdown(activity);
    assert.deepEqual(breakdown, [
      {categoryId: 'food_dining', amount: 7_000, entries: 2},
      {categoryId: 'transportation', amount: 3_000, entries: 1},
    ]);
  });
});

describe('Money formatting', () => {
  it('always renders a figure, with or without Intl', () => {
    // Both paths must agree on shape, because a release build with a trimmed
    // ICU silently falls through to the manual formatter.
    assert.match(peso(1234.5), /1,234\.50/);
    assert.match(money(1234.5, 'USD'), /1,234\.50/);
    assert.equal(money(0, 'JPY').includes('.'), false);
    assert.match(peso(-50), /^-?[^\d]*50\.00$/);
  });

  it('renders period keys without Intl', () => {
    assert.equal(formatPeriod('2026-08'), 'August 2026');
    assert.equal(formatPeriod('2026-08', true), 'Aug');
    assert.equal(formatPeriod('nonsense'), 'nonsense');
  });
});

describe('Account balance integrity', () => {
  const addAccount = (account: Partial<FinanceAccount> = {}) => {
    useAccountsStore.getState().addAccount({
      providerId: 'wise',
      name: 'USD balance',
      type: 'savings',
      nature: 'asset',
      currency: 'USD',
      balance: 1_000,
      rateToPhp: 56,
      ...account,
    } as Omit<FinanceAccount, 'id' | 'updatedAt'>);
    return useAccountsStore.getState().accounts[0];
  };

  it('converts PHP ledger activity and reverses it exactly', () => {
    const account = addAccount();
    useAccountsStore.getState().postTransaction(account.id, 'expense', 5_600);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 900);
    useAccountsStore.getState().postTransaction(account.id, 'income', 5_600);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 1_000);
    assert.equal(accountValueInPhp(useAccountsStore.getState().accounts[0]), 56_000);
  });

  it('increases liabilities on expenses and decreases them on payments', () => {
    const account = addAccount({
      nature: 'liability',
      type: 'credit_card',
      currency: 'PHP',
      balance: 10_000,
      rateToPhp: 1,
    });
    useAccountsStore.getState().postTransaction(account.id, 'expense', 1_250);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 11_250);
    useAccountsStore.getState().postTransaction(account.id, 'income', 1_250);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 10_000);
  });

  it('rejects malformed accounts and balance updates', () => {
    addAccount({name: '   '});
    assert.equal(useAccountsStore.getState().accounts.length, 0);
    const account = addAccount();
    useAccountsStore.getState().updateBalance(account.id, Number.NaN, 0);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 1_000);
  });
});

describe('Wallet input invariants', () => {
  it('rejects invalid entries and trims accepted descriptions', () => {
    const wallet = useWalletStore.getState();
    assert.equal(
      wallet.addTransaction({
        type: 'expense',
        amount: 0,
        description: 'Invalid',
        category: 'food_dining',
      }),
      '',
    );
    assert.equal(
      wallet.addTransaction({
        type: 'expense',
        amount: 100,
        description: '   ',
        category: 'food_dining',
      }),
      '',
    );
    const id = wallet.addTransaction({
      type: 'expense',
      amount: 100,
      description: '  Lunch  ',
      category: 'food_dining',
    });
    assert.ok(id);
    assert.equal(useWalletStore.getState().transactions[0].description, 'Lunch');
  });

  it('rejects impossible transfers and invalid edits', () => {
    const wallet = useWalletStore.getState();
    assert.equal(
      wallet.addTransfer({
        amount: 500,
        description: 'Move',
        accountId: 'one',
        toAccountId: 'one',
      }),
      '',
    );
    const id = wallet.addTransaction({
      type: 'income',
      amount: 500,
      description: 'Salary',
      category: 'salary',
    });
    wallet.updateTransaction(id, {amount: Number.NaN});
    assert.equal(useWalletStore.getState().transactions[0].amount, 500);
  });
});

describe('SDK ledger reconciliation', () => {
  const addPhpAccount = (name: string, balance: number) => {
    useAccountsStore.getState().addAccount({
      providerId: 'bpi',
      name,
      type: 'savings',
      nature: 'asset',
      currency: 'PHP',
      balance,
      rateToPhp: 1,
    });
    return useAccountsStore.getState().accounts.find(account => account.name === name)!;
  };

  it('reconciles linked account balances through add, edit, and delete', () => {
    const account = addPhpAccount('Everyday', 10_000);
    const id = financeActions.addTransaction({
      type: 'expense',
      amount: 1_000,
      description: 'Groceries',
      category: 'food_dining',
      accountId: account.id,
    });
    assert.ok(id);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 9_000);

    financeActions.updateTransaction(id, {
      type: 'expense',
      amount: 500,
      description: 'Groceries corrected',
      category: 'food_dining',
      accountId: account.id,
    });
    assert.equal(useAccountsStore.getState().accounts[0].balance, 9_500);
    assert.equal(useWalletStore.getState().transactions[0].amount, 500);

    financeActions.deleteTransaction(id);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 10_000);
    assert.equal(useWalletStore.getState().transactions.length, 0);
  });

  it('reverses both sides of a transfer and rejects archived accounts', () => {
    const source = addPhpAccount('Source', 10_000);
    const destination = addPhpAccount('Destination', 5_000);
    const id = financeActions.transferBetweenAccounts({
      amount: 2_000,
      description: 'Move savings',
      fromAccountId: source.id,
      toAccountId: destination.id,
    });
    assert.ok(id);
    const balances = () =>
      new Map(useAccountsStore.getState().accounts.map(account => [account.id, account.balance]));
    assert.equal(balances().get(source.id), 8_000);
    assert.equal(balances().get(destination.id), 7_000);
    financeActions.deleteTransaction(id);
    assert.equal(balances().get(source.id), 10_000);
    assert.equal(balances().get(destination.id), 5_000);

    useAccountsStore.getState().archiveAccount(destination.id);
    assert.equal(
      financeActions.addTransaction({
        type: 'income',
        amount: 1_000,
        description: 'Should fail',
        category: 'salary',
        accountId: destination.id,
      }),
      '',
    );
    assert.equal(useWalletStore.getState().transactions.length, 0);
  });

  it('marks a linked bill unpaid when its Wallet payment is deleted', () => {
    const account = addPhpAccount('Bills', 5_000);
    useBillsStore
      .getState()
      .addBill({name: 'Power', amount: 1_000, dueDay: 15, paymentAccountId: account.id});
    const bill = useBillsStore.getState().bills[0];
    const id = financeActions.addTransaction({
      type: 'expense',
      amount: bill.amount,
      description: 'Power bill',
      category: 'bills_utilities',
      accountId: account.id,
      billId: bill.id,
      billPeriod: '2026-08',
    });
    useBillsStore.getState().markPaid(bill.id, '2026-08', id);
    assert.equal(useBillsStore.getState().bills[0].lastPaidPeriod, '2026-08');
    financeActions.deleteTransaction(id);
    assert.equal(useBillsStore.getState().bills[0].lastPaidPeriod, undefined);
    assert.equal(useAccountsStore.getState().accounts[0].balance, 5_000);
  });
});

describe('Bills and budgets validation', () => {
  it('rejects invalid bills and protects paid periods', () => {
    const bills = useBillsStore.getState();
    bills.addBill({name: 'Power', amount: 1_000, dueDay: 32});
    assert.equal(useBillsStore.getState().bills.length, 0);
    bills.addBill({name: ' Power ', amount: 1_000, dueDay: 15});
    const bill = useBillsStore.getState().bills[0];
    assert.equal(bill.name, 'Power');
    bills.markPaid(bill.id, 'not-a-period', 'transaction');
    assert.equal(useBillsStore.getState().bills[0].lastPaidPeriod, undefined);
    bills.markPaid(bill.id, '2026-08', 'transaction');
    assert.equal(useBillsStore.getState().bills[0].lastPaidPeriod, '2026-08');
    bills.markUnpaid(bill.id, '2026-07');
    assert.equal(useBillsStore.getState().bills[0].lastPaidPeriod, '2026-08');
  });

  it('upserts one valid limit per category and rejects non-positive values', () => {
    const budget = useBudgetStore.getState();
    budget.upsertLimit('food_dining', 5_000);
    budget.upsertLimit('food_dining', 6_000);
    budget.upsertLimit('transportation', -1);
    assert.equal(useBudgetStore.getState().limits.length, 1);
    assert.equal(useBudgetStore.getState().limits[0].limit, 6_000);
  });
});

describe('Editing records', () => {
  it('updates bill details without touching paid state', () => {
    const bills = useBillsStore.getState();
    bills.addBill({name: 'Power', amount: 1_000, dueDay: 15});
    const bill = useBillsStore.getState().bills[0];
    bills.markPaid(bill.id, '2026-09', 'tx');
    bills.updateBill(bill.id, {name: ' Meralco ', amount: 1_200, dueDay: 20});
    const after = useBillsStore.getState().bills[0];
    assert.deepEqual([after.name, after.amount, after.dueDay, after.lastPaidPeriod], ['Meralco', 1_200, 20, '2026-09']);
    bills.updateBill(bill.id, {dueDay: 32});
    bills.updateBill(bill.id, {amount: 0});
    assert.equal(useBillsStore.getState().bills[0].dueDay, 20);
    assert.equal(useBillsStore.getState().bills[0].amount, 1_200);
  });

  it('caps saved when a goal target is lowered and rejects bad deadlines', () => {
    const goals = useGoalsStore.getState();
    goals.addGoal({name: 'Trip', target: 10_000});
    const goal = useGoalsStore.getState().goals[0];
    goals.contribute(goal.id, 8_000);
    goals.updateGoal(goal.id, {target: 5_000, deadline: '2027-01-15'});
    assert.deepEqual(
      [useGoalsStore.getState().goals[0].target, useGoalsStore.getState().goals[0].saved],
      [5_000, 5_000],
    );
    goals.updateGoal(goal.id, {deadline: 'soon'});
    assert.equal(useGoalsStore.getState().goals[0].deadline, '2027-01-15');
  });

  it('edits debts, remittances, and circles with the same validation as creation', () => {
    const debts = useDebtsStore.getState();
    debts.addDebt({person: 'Ana', amount: 500, direction: 'receivable', note: 'lunch'});
    const debt = useDebtsStore.getState().debts[0];
    debts.updateDebt(debt.id, {amount: 750, note: '  '});
    assert.deepEqual([useDebtsStore.getState().debts[0].amount, useDebtsStore.getState().debts[0].note], [750, undefined]);
    debts.updateDebt(debt.id, {person: ' '});
    assert.equal(useDebtsStore.getState().debts[0].person, 'Ana');

    const remit = useRemitStore.getState();
    remit.addEntry({direction: 'sent', person: 'Nanay', channel: 'gcash', amount: 1_000, fee: 15});
    const entry = useRemitStore.getState().entries[0];
    remit.updateEntry(entry.id, {fee: -1});
    assert.equal(useRemitStore.getState().entries[0].fee, 15);
    remit.updateEntry(entry.id, {channel: ' maya-wallet ', amount: 1_500});
    assert.deepEqual([useRemitStore.getState().entries[0].channel, useRemitStore.getState().entries[0].amount], ['maya-wallet', 1_500]);

    const circles = useCirclesStore.getState();
    circles.addCircle({name: 'Office', amount: 500, members: ['Ana', 'Ben', 'Cai'], frequency: 'monthly'});
    const circle = useCirclesStore.getState().circles[0];
    circles.advanceRound(circle.id);
    circles.advanceRound(circle.id);
    circles.updateCircle(circle.id, {members: ['Ana', 'Ben']});
    assert.equal(useCirclesStore.getState().circles[0].currentRound, 2);
    circles.updateCircle(circle.id, {members: ['Solo']});
    assert.deepEqual(useCirclesStore.getState().circles[0].members, ['Ana', 'Ben']);
  });

  it('edits account identity without moving its balance', () => {
    useAccountsStore.getState().addAccount({
      providerId: 'bpi', name: 'Payroll', type: 'payroll', nature: 'asset', currency: 'PHP', balance: 5_000, rateToPhp: 1,
    });
    const account = useAccountsStore.getState().accounts[0];
    useAccountsStore.getState().updateAccount(account.id, {name: ' Salary ', lastFour: '1234', creditLimit: 0});
    const after = useAccountsStore.getState().accounts[0];
    assert.deepEqual([after.name, after.lastFour, after.balance, after.creditLimit], ['Salary', '1234', 5_000, undefined]);
  });
});

describe('Community app recovery and validation', () => {
  it('caps goal contributions and rejects negative changes', () => {
    const goals = useGoalsStore.getState();
    goals.addGoal({name: ' Emergency fund ', target: 10_000});
    const goal = useGoalsStore.getState().goals[0];
    goals.contribute(goal.id, -500);
    assert.equal(useGoalsStore.getState().goals[0].saved, 0);
    goals.contribute(goal.id, 12_000);
    assert.equal(useGoalsStore.getState().goals[0].saved, 10_000);
  });

  it('settles and reopens only valid debt records', () => {
    const debts = useDebtsStore.getState();
    debts.addDebt({person: ' ', amount: 1_000, direction: 'receivable'});
    assert.equal(useDebtsStore.getState().debts.length, 0);
    debts.addDebt({person: ' Ana ', amount: 1_000, direction: 'receivable'});
    const debt = useDebtsStore.getState().debts[0];
    debts.settleDebt(debt.id);
    assert.ok(useDebtsStore.getState().debts[0].settledAt);
    debts.reopenDebt(debt.id);
    assert.equal(useDebtsStore.getState().debts[0].settledAt, undefined);
  });

  it('deduplicates circle members and keeps rounds in bounds', () => {
    const circles = useCirclesStore.getState();
    circles.addCircle({
      name: ' Team ',
      amount: 500,
      members: ['Ana', ' Ana ', 'Ben'],
      frequency: 'weekly',
    });
    const circle = useCirclesStore.getState().circles[0];
    assert.deepEqual(circle.members, ['Ana', 'Ben']);
    circles.advanceRound(circle.id);
    circles.advanceRound(circle.id);
    circles.advanceRound(circle.id);
    assert.equal(useCirclesStore.getState().circles[0].currentRound, 2);
    circles.rewindRound(circle.id);
    assert.equal(useCirclesStore.getState().circles[0].currentRound, 1);
  });

  it('rejects malformed remittance fees and trims accepted records', () => {
    const remit = useRemitStore.getState();
    remit.addEntry({
      direction: 'sent',
      person: 'Ana',
      channel: 'gcash',
      amount: 1_000,
      fee: Number.NaN,
    });
    assert.equal(useRemitStore.getState().entries.length, 0);
    remit.addEntry({
      direction: 'received',
      person: ' Ben ',
      channel: ' wise ',
      amount: 1_000,
      fee: 0,
    });
    assert.equal(useRemitStore.getState().entries[0].person, 'Ben');
    assert.equal(useRemitStore.getState().entries[0].channel, 'wise');
  });
});

describe('Subscriptions', () => {
  it('advances renewals by one cycle and clamps to month end', () => {
    assert.equal(nextRenewalAfter('2026-01-31', 'monthly'), '2026-02-28');
    assert.equal(nextRenewalAfter('2026-12-15', 'monthly'), '2027-01-15');
    assert.equal(nextRenewalAfter('2028-02-29', 'yearly'), '2029-02-28');
    assert.equal(monthlyCost({amount: 1_200, cycle: 'yearly'}), 100);
  });

  it('marks renewals, pauses, and rejects bad input', () => {
    const store = useSubscriptionsStore.getState();
    store.addSubscription({name: ' Spotify ', amount: 149, cycle: 'monthly', nextRenewal: '2026-09-30'});
    store.addSubscription({name: '', amount: 149, cycle: 'monthly', nextRenewal: '2026-09-30'});
    store.addSubscription({name: 'Bad date', amount: 149, cycle: 'monthly', nextRenewal: '30/09/2026'});
    assert.equal(useSubscriptionsStore.getState().subscriptions.length, 1);
    const id = useSubscriptionsStore.getState().subscriptions[0].id;
    store.markRenewed(id, 'tx-1');
    let item = useSubscriptionsStore.getState().subscriptions[0];
    assert.deepEqual([item.name, item.nextRenewal, item.lastRenewalTransactionId], ['Spotify', '2026-10-30', 'tx-1']);
    store.pauseSubscription(id);
    assert.ok(useSubscriptionsStore.getState().subscriptions[0].pausedAt);
    store.resumeSubscription(id, '2026-12-01');
    item = useSubscriptionsStore.getState().subscriptions[0];
    assert.deepEqual([item.pausedAt, item.nextRenewal], [undefined, '2026-12-01']);
    store.updateSubscription(id, {amount: -5});
    assert.equal(useSubscriptionsStore.getState().subscriptions[0].amount, 149);
  });
});

describe('Credit terms', () => {
  it('keeps one set of terms per card and validates days', () => {
    const store = useCreditStore.getState();
    store.setTerms({accountId: 'card', statementDay: 5, dueDay: 25});
    store.setTerms({accountId: 'card', statementDay: 6, dueDay: 26, interestRate: 36});
    store.setTerms({accountId: 'card', statementDay: 0, dueDay: 26});
    store.setTerms({accountId: 'other', statementDay: 1, dueDay: 32});
    assert.deepEqual(useCreditStore.getState().terms, [{accountId: 'card', statementDay: 6, dueDay: 26, interestRate: 36}]);
    assert.equal(utilisation(30_000, 100_000), 30);
    assert.equal(utilisation(30_000, undefined), 0);
    assert.equal(utilisation(150_000, 100_000), 100);
    assert.equal(daysUntilDay(25, new Date(2026, 8, 5)), 20);
    assert.equal(daysUntilDay(5, new Date(2026, 8, 5)), 0);
    assert.equal(daysUntilDay(1, new Date(2026, 8, 5)), 26);
    assert.equal(daysUntilDay(31, new Date(2026, 8, 5)), 25);
  });
});

describe('Shared pools', () => {
  it('keeps every member balance summing to zero and settles with the fewest transfers', () => {
    const store = useSharedStore.getState();
    store.addPool({name: 'Trip', members: ['Me', 'Carlo', 'Nica', ' Carlo ']});
    const pool = () => useSharedStore.getState().pools[0];
    assert.deepEqual(pool().members, ['Me', 'Carlo', 'Nica']);
    store.addExpense(pool().id, {description: 'Van', amount: 3_000, paidBy: 'Me', splitAmong: ['Me', 'Carlo', 'Nica']});
    store.addExpense(pool().id, {description: 'Dinner', amount: 1_200, paidBy: 'Nica', splitAmong: ['Me', 'Nica']});
    store.addExpense(pool().id, {description: 'Ghost', amount: 500, paidBy: 'Bea', splitAmong: ['Me']});
    assert.equal(pool().expenses.length, 2);
    const balances = poolBalances(pool());
    assert.deepEqual(balances, {Me: 1_400, Carlo: -1_000, Nica: -400});
    assert.equal(Object.values(balances).reduce((a, b) => a + b, 0), 0);
    assert.deepEqual(settlementPlan(balances), [
      {from: 'Carlo', to: 'Me', amount: 1_000},
      {from: 'Nica', to: 'Me', amount: 400},
    ]);
    store.settleUp(pool().id, 'Carlo', 'Me', 1_000);
    assert.deepEqual(poolBalances(pool()), {Me: 400, Carlo: 0, Nica: -400});
    // A member with history stays; a rename to fewer than two members is refused.
    store.updatePool(pool().id, {members: ['Me', 'Nica']});
    assert.deepEqual(pool().members, ['Me', 'Carlo', 'Nica']);
    store.updatePool(pool().id, {members: ['Me', 'Carlo', 'Nica', 'Bea'], name: 'Baguio'});
    assert.deepEqual([pool().name, pool().members.length], ['Baguio', 4]);
    store.deleteExpense(pool().id, pool().expenses.find(e => e.description === 'Dinner')!.id);
    assert.deepEqual(poolBalances(pool()), {Me: 1_000, Carlo: 0, Nica: -1_000, Bea: 0});
  });
});

describe('Backups', () => {
  it('includes Learn progress and replaces plain mini-app keys during restore', async () => {
    const {namespacedStorage} = await import('../storage');
    const learn = namespacedStorage('learn');
    await learn.set('progress.v1', '{"bites":{"kids.wants.1":true}}');
    const withLearn = await createBackup();
    assert.equal(withLearn.data['jinnie.learn.progress.v1'], '{"bites":{"kids.wants.1":true}}');
    assert.equal(await restoreBackup({product: 'Jinnie', version: 1, data: {}}), true);
    assert.equal(await learn.get('progress.v1'), null);
    assert.equal(await restoreBackup(withLearn), true);
    assert.equal(await learn.get('progress.v1'), withLearn.data['jinnie.learn.progress.v1']);
  });

  it('seals and reopens a backup with the passphrase only', async () => {
    useGoalsStore.getState().addGoal({name: 'Trip', target: 1_000});
    await new Promise(resolve => setTimeout(resolve, 10));
    const backup = await createBackup();
    assert.ok(Object.keys(backup.data).some(key => key.startsWith('jinnie.')));
    const sealed = await encryptBackup(backup, 'correct horse');
    assert.ok(!JSON.stringify(sealed).includes('Trip'));
    const parsed = parseBackupText(JSON.stringify(sealed));
    assert.equal(parsed?.kind, 'encrypted');
    if (parsed?.kind !== 'encrypted') return;
    assert.equal(await decryptBackup(parsed.file, 'wrong'), null);
    const tampered = {...parsed.file, ciphertext: parsed.file.ciphertext.replace(/^../, 'ff')};
    assert.equal(await decryptBackup(tampered, 'correct horse'), null);
    const opened = await decryptBackup(parsed.file, 'correct horse');
    assert.deepEqual(opened?.data, backup.data);
  });

  it('refuses files that would write outside the jinnie namespace', () => {
    assert.equal(readBackup({product: 'Jinnie', version: 1, data: {'other.key': 'x'}}), null);
    assert.equal(readBackup({product: 'Jinnie', version: 2, data: {}}), null);
    assert.equal(parseBackupText('not json'), null);
    assert.equal(parseBackupText(JSON.stringify({product: 'Jinnie', version: 1, data: {}}))?.kind, 'plain');
  });

  it('restores a plain backup into the live stores', async () => {
    const backup = readBackup({
      product: 'Jinnie',
      version: 1,
      data: {'jinnie.goals': JSON.stringify({state: {goals: [{id: 'g', name: 'Restored', target: 5, saved: 0}]}, version: 0})},
    });
    assert.ok(backup);
    useDebtsStore.getState().addDebt({person: 'Stale', amount: 5, direction: 'payable'});
    assert.equal(await restoreBackup(backup!), true);
    assert.equal(useGoalsStore.getState().goals[0]?.name, 'Restored');
    // A store the backup does not mention comes back empty, not as it was.
    assert.deepEqual(useDebtsStore.getState().debts, []);
  });
});

describe('App lock', () => {
  it('stores only a salted hash and verifies the PIN', async () => {
    assert.equal(validPin('123'), false);
    assert.equal(validPin('12ab'), false);
    assert.equal(await appLock.isEnabled(), false);
    assert.equal(await appLock.setPin('2468'), true);
    assert.equal(await appLock.isEnabled(), true);
    assert.equal(await appLock.verifyPin('2468'), true);
    assert.equal(await appLock.verifyPin('2469'), false);
    await appLock.clear();
    assert.equal(await appLock.isEnabled(), false);
    assert.equal(await appLock.verifyPin('2468'), false);
  });
});
