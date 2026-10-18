import {useSyncExternalStore} from 'react';
import {useAccountsStore} from './accounts';
import {useWalletStore} from './wallet';
import {useBillsStore} from './bills';
import {useBudgetStore} from './budget';
import {useGoalsStore} from './goals';
import {useDebtsStore} from './debts';
import {useCirclesStore} from './circles';
import {useRemitStore} from './remit';
import {useSubscriptionsStore} from './subscriptions';
import {useCreditStore} from './credit';
import {useSharedStore} from './shared';
import {usePrivacyStore} from './privacy';
import {useProfileStore} from './profile';
import {useCatalogStore} from './catalog';
import {useLauncherStore} from './launcher';

export * from './accounts';
export * from './wallet';
export * from './bills';
export * from './budget';
export * from './goals';
export * from './debts';
export * from './circles';
export * from './remit';
export * from './subscriptions';
export * from './credit';
export * from './shared';
export * from './privacy';
export * from './profile';
export * from './catalog';
export * from './launcher';

/**
 * Every persisted store in the platform, in one place.
 *
 * On the web these lived inside each app folder and the shell reached across
 * folder boundaries to seed and back them up. That does not survive
 * federation — the host cannot statically import a remote's module. So the
 * stores live here, in the shared singleton, and the sandbox guarantee is
 * enforced where it actually matters: `host.finance` is handed only to core
 * apps, and each app persists under its own `jinnie.<id>` key.
 */
export const platformStores = [
  useAccountsStore,
  useWalletStore,
  useBillsStore,
  useBudgetStore,
  useGoalsStore,
  useDebtsStore,
  useCirclesStore,
  useRemitStore,
  useSubscriptionsStore,
  useCreditStore,
  useSharedStore,
  usePrivacyStore,
  useProfileStore,
  useCatalogStore,
  useLauncherStore,
] as const;

function allHydrated(): boolean {
  return platformStores.every(store => store.persist.hasHydrated());
}

function subscribeToHydration(onStoreChange: () => void) {
  const unsubscribers = platformStores.map(store =>
    store.persist.onFinishHydration(onStoreChange),
  );
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

/**
 * `false` until AsyncStorage has been read for every store. The shell holds
 * the splash until this flips, so no screen renders an empty balance that
 * then jumps.
 */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribeToHydration, allHydrated, allHydrated);
}

/** Re-read every store from disk. Used after a backup restore. */
export async function rehydrateAllStores(): Promise<void> {
  await Promise.all(platformStores.map(store => store.persist.rehydrate()));
}

/**
 * Return every store to its initial state, in memory and on disk.
 *
 * There is no page reload to fall back on here, so "delete local data" has to
 * clear the live stores too. Keeping this beside the store list means a new
 * store is reset by construction rather than by remembering to add it to
 * Settings.
 */
export async function resetAllStores(): Promise<void> {
  useAccountsStore.setState({accounts: [], baseCurrency: 'PHP'});
  useWalletStore.setState({transactions: []});
  useBillsStore.setState({bills: []});
  useBudgetStore.setState({limits: []});
  useGoalsStore.setState({goals: []});
  useDebtsStore.setState({debts: []});
  useCirclesStore.setState({circles: []});
  useRemitStore.setState({entries: []});
  useSubscriptionsStore.setState({subscriptions: []});
  useCreditStore.setState({terms: []});
  useSharedStore.setState({pools: []});
  usePrivacyStore.setState({valuesHidden: false});
  useProfileStore.setState({name: ''});
  useCatalogStore.setState({entries: []});
  useLauncherStore.setState({hidden: []});
  await Promise.all(platformStores.map(store => store.persist.clearStorage()));
}
