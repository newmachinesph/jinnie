import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {accountValueInPhp, useAccountsStore} from './stores/accounts';
import {useWalletStore} from './stores/wallet';
import {financeActions} from './finance-actions';
import {namespacedStorage} from './storage';
import type {Grant} from './manifest';
import {getApp} from './apps';

/*
 * The Jinnie mini-app bridge.
 *
 * This is the entire surface a mini app may touch. It is the same contract the
 * web build shipped, with one deliberate change: `storage` is asynchronous,
 * because AsyncStorage is. See docs/SDK.md.
 *
 * `HostProvider` is host-shell infrastructure. It is exported here so the
 * contract and its only implementation stay in one reviewed file. Mini apps
 * never render it.
 */

// -- Bridge contract ---------------------------------------------------

export interface HostFinance {
  /** Headline balance. Net worth when accounts exist, otherwise ledger balance. */
  balance: number;
  baseCurrency: 'PHP';
  accounts: readonly {
    id: string;
    providerId: string;
    name: string;
    type: string;
    nature: 'asset' | 'liability';
    currency: string;
    balance: number;
    rateToPhp: number;
    lastFour?: string;
  }[];
  assetTotal: number;
  liabilityTotal: number;
  netWorth: number;
  /** Read-only Wallet ledger for first-party planning and analytics apps. */
  transactions: readonly {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string;
    category: string;
    accountId?: string;
    toAccountId?: string;
    billId?: string;
    billPeriod?: string;
    date: string;
  }[];
  /** Record a transaction in the shared Wallet ledger. */
  addTransaction(t: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    accountId?: string;
    billId?: string;
    billPeriod?: string;
  }): string;
  /** Move PHP-denominated value between two active accounts, neutral to cash flow. */
  transferBetweenAccounts(transfer: {
    amount: number;
    description: string;
    fromAccountId: string;
    toAccountId: string;
  }): string;
  /** Edit a ledger entry and reconcile any linked account balance. */
  updateTransaction(
    id: string,
    changes: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      category: string;
      accountId?: string;
    },
  ): void;
  /** Remove a ledger entry and reverse it from any linked account balance. */
  deleteTransaction(id: string): void;
}

/**
 * The narrow way into Wallet: post one entry. Given to core apps and to
 * community apps whose manifest carries the `wallet:post` grant, so an app
 * that settles money can record it without seeing anyone's history.
 */
export interface HostWallet {
  /** Active accounts an entry may be posted against. */
  accounts: {id: string; name: string; currency: string}[];
  /** Post one income or expense entry. Returns its id, or '' when refused. */
  post(entry: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    accountId?: string;
  }): string;
}

export interface HostBridge {
  /** The mini app this bridge instance is scoped to. */
  app: {id: string; name: string; version: string};
  /** Signed-in user, or null when running as a guest. */
  user: {id: string; name: string} | null;
  /** Live connectivity reported by the host. */
  online: boolean;
  /** Host display currency (ISO 4217). */
  currency: string;
  /** Key-value storage namespaced to this mini app. Asynchronous on device. */
  storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
  /** Shared Wallet ledger. Core apps only — undefined for community apps. */
  finance?: HostFinance;
  /** Post entries to Wallet. Core apps, and community apps granted `wallet:post`. */
  wallet?: HostWallet;
  /** Open a registered sibling app. Core apps only; never posts a transaction. */
  openApp?(appId: string): boolean;
  /** Return to the launcher. */
  close(): void;
}

// -- Implementation (host side) ---------------------------------------

const HostContext = createContext<HostBridge | null>(null);

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(
    () =>
      NetInfo.addEventListener(state => {
        // `isInternetReachable` is null while the probe is still in flight;
        // treat that as connected so the UI does not flash "offline" on launch.
        setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
      }),
    [],
  );
  return online;
}

const NO_GRANTS: readonly Grant[] = [];

export function HostProvider({
  app,
  kind,
  grants = NO_GRANTS,
  onClose,
  onOpenApp,
  children,
}: {
  app: {id: string; name: string; version: string};
  kind: 'core' | 'community' | 'system';
  grants?: readonly Grant[];
  onClose: () => void;
  onOpenApp?: (appId: string) => void;
  children: ReactNode;
}) {
  const online = useOnline();
  const transactions = useWalletStore(state => state.transactions);
  const storedAccounts = useAccountsStore(state => state.accounts);

  const accounts = useMemo(
    () => storedAccounts.filter(account => !account.archivedAt),
    [storedAccounts],
  );

  const totals = useMemo(() => {
    const assetTotal = accounts
      .filter(account => account.nature === 'asset')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    const liabilityTotal = accounts
      .filter(account => account.nature === 'liability')
      .reduce((sum, account) => sum + accountValueInPhp(account), 0);
    const ledgerBalance = transactions.reduce((sum, transaction) => {
      if (transaction.type === 'transfer') return sum;
      return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
    }, 0);
    const netWorth = assetTotal - liabilityTotal;
    return {
      assetTotal,
      liabilityTotal,
      netWorth,
      balance: accounts.length ? netWorth : ledgerBalance,
    };
  }, [accounts, transactions]);

  const bridge = useMemo<HostBridge>(
    () => ({
      app,
      user: null, // populated once host sign-in ships
      online,
      currency: 'PHP',
      storage: namespacedStorage(app.id),
      finance:
        kind !== 'community'
          ? {
              baseCurrency: 'PHP',
              accounts,
              transactions,
              ...totals,
              ...financeActions,
            }
          : undefined,
      wallet:
        kind !== 'community' || grants.includes('wallet:post')
          ? {
              accounts: accounts.map(({id, name, currency}) => ({id, name, currency})),
              post: financeActions.addTransaction,
            }
          : undefined,
      openApp: kind !== 'community' && onOpenApp
        ? id => {
            if (id === app.id || !getApp(id)) return false;
            onOpenApp(id);
            return true;
          }
        : undefined,
      close: onClose,
    }),
    [app, kind, grants, online, accounts, transactions, totals, onClose, onOpenApp],
  );

  return <HostContext.Provider value={bridge}>{children}</HostContext.Provider>;
}

/** Consume the host bridge from inside a mini app. */
export function useHost(): HostBridge {
  const bridge = useContext(HostContext);
  if (!bridge) {
    throw new Error('useHost() must be called from a mini app rendered by the host shell');
  }
  return bridge;
}
