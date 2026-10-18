import {createDemoData, isDemoId} from './demo-data';
import {preferences} from './storage';
import {useAccountsStore} from './stores/accounts';
import {useWalletStore} from './stores/wallet';
import {useBudgetStore} from './stores/budget';
import {useBillsStore} from './stores/bills';
import {useGoalsStore} from './stores/goals';
import {useDebtsStore} from './stores/debts';
import {useRemitStore} from './stores/remit';
import {useCirclesStore} from './stores/circles';
import {useSubscriptionsStore} from './stores/subscriptions';
import {useCreditStore} from './stores/credit';
import {useSharedStore} from './stores/shared';

const DEMO_STATE_KEY = 'demo.state';

/**
 * The sample profile is layered on top of whatever the user already has:
 * every write replaces only rows whose id starts with `demo-`, so loading,
 * resetting, and removing it never touches a real record.
 */
export function loadDemoData(): void {
  const demo = createDemoData();
  const keepReal = <T extends {id: string}>(items: T[]) => items.filter(item => !isDemoId(item.id));

  useAccountsStore.setState(state => ({accounts: [...demo.accounts, ...keepReal(state.accounts)]}));
  useWalletStore.setState(state => ({
    transactions: [...demo.transactions, ...keepReal(state.transactions)],
  }));
  useBudgetStore.setState(state => ({limits: [...demo.budgets, ...keepReal(state.limits)]}));
  useBillsStore.setState(state => ({bills: [...demo.bills, ...keepReal(state.bills)]}));
  useGoalsStore.setState(state => ({goals: [...demo.goals, ...keepReal(state.goals)]}));
  useDebtsStore.setState(state => ({debts: [...demo.debts, ...keepReal(state.debts)]}));
  useRemitStore.setState(state => ({entries: [...demo.remittances, ...keepReal(state.entries)]}));
  useCirclesStore.setState(state => ({circles: [...demo.circles, ...keepReal(state.circles)]}));
  useSubscriptionsStore.setState(state => ({
    subscriptions: [...demo.subscriptions, ...keepReal(state.subscriptions)],
  }));
  useSharedStore.setState(state => ({pools: [...demo.sharedPools, ...keepReal(state.pools)]}));
  // Terms hang off the sample card, so they are keyed by its id instead of their own.
  useCreditStore.setState(state => ({
    terms: [...demo.creditTerms, ...state.terms.filter(item => !isDemoId(item.accountId))],
  }));

  void preferences.set(DEMO_STATE_KEY, 'loaded');
}

export function removeDemoData(): void {
  const keepReal = <T extends {id: string}>(items: T[]) => items.filter(item => !isDemoId(item.id));

  useAccountsStore.setState(state => ({accounts: keepReal(state.accounts)}));
  useWalletStore.setState(state => ({transactions: keepReal(state.transactions)}));
  useBudgetStore.setState(state => ({limits: keepReal(state.limits)}));
  useBillsStore.setState(state => ({bills: keepReal(state.bills)}));
  useGoalsStore.setState(state => ({goals: keepReal(state.goals)}));
  useDebtsStore.setState(state => ({debts: keepReal(state.debts)}));
  useRemitStore.setState(state => ({entries: keepReal(state.entries)}));
  useCirclesStore.setState(state => ({circles: keepReal(state.circles)}));
  useSubscriptionsStore.setState(state => ({subscriptions: keepReal(state.subscriptions)}));
  useSharedStore.setState(state => ({pools: keepReal(state.pools)}));
  useCreditStore.setState(state => ({terms: state.terms.filter(item => !isDemoId(item.accountId))}));

  void preferences.set(DEMO_STATE_KEY, 'removed');
}

/** Refresh the sample rows on launch if the profile was left loaded. */
export async function restoreDemoDataIfLoaded(): Promise<void> {
  if ((await preferences.get(DEMO_STATE_KEY)) === 'loaded') loadDemoData();
}

export function useDemoActive(): boolean {
  const accounts = useAccountsStore(state => state.accounts);
  const transactions = useWalletStore(state => state.transactions);
  const budgets = useBudgetStore(state => state.limits);
  const bills = useBillsStore(state => state.bills);
  const goals = useGoalsStore(state => state.goals);
  const debts = useDebtsStore(state => state.debts);
  const remittances = useRemitStore(state => state.entries);
  const circles = useCirclesStore(state => state.circles);
  const subscriptions = useSubscriptionsStore(state => state.subscriptions);
  const pools = useSharedStore(state => state.pools);

  return [
    ...accounts,
    ...transactions,
    ...budgets,
    ...bills,
    ...goals,
    ...debts,
    ...remittances,
    ...circles,
    ...subscriptions,
    ...pools,
  ].some(item => isDemoId(item.id));
}
