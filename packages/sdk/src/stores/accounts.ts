import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {AccountNature, AccountType} from '../catalogs';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface FinanceAccount {
  id: string;
  providerId: string;
  customProviderName?: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  currency: string;
  /** Native-currency balance. Liabilities are stored as positive amounts owed. */
  balance: number;
  /** Number of Philippine pesos represented by one unit of the native currency. */
  rateToPhp: number;
  lastFour?: string;
  creditLimit?: number;
  updatedAt: string;
  archivedAt?: string;
}

interface AccountsState {
  accounts: FinanceAccount[];
  baseCurrency: 'PHP';
  addAccount: (account: Omit<FinanceAccount, 'id' | 'updatedAt'>) => void;
  /** Identity and terms; the balance and rate go through updateBalance. */
  updateAccount: (
    id: string,
    changes: Partial<Omit<FinanceAccount, 'id' | 'updatedAt' | 'balance' | 'rateToPhp' | 'archivedAt'>>,
  ) => void;
  updateBalance: (id: string, balance: number, rateToPhp?: number) => void;
  /** Apply a PHP-denominated ledger transaction to this account's native balance. */
  postTransaction: (id: string, type: 'income' | 'expense', amountInPhp: number) => void;
  archiveAccount: (id: string) => void;
  restoreAccount: (id: string) => void;
  deleteAccount: (id: string) => void;
}

export function accountValueInPhp(account: FinanceAccount): number {
  const rate =
    Number.isFinite(account.rateToPhp) && account.rateToPhp > 0 ? account.rateToPhp : 1;
  return account.balance * rate;
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    set => ({
      accounts: [],
      baseCurrency: 'PHP',
      addAccount: account =>
        set(state => {
          if (
            !account.providerId ||
            !account.name.trim() ||
            !account.currency ||
            !Number.isFinite(account.balance) ||
            !Number.isFinite(account.rateToPhp) ||
            account.rateToPhp <= 0
          ) {
            return state;
          }
          return {
            accounts: [
              {
                ...account,
                name: account.name.trim(),
                id: generateId(),
                updatedAt: new Date().toISOString(),
              },
              ...state.accounts,
            ],
          };
        }),
      updateAccount: (id, changes) =>
        set(state => {
          if (changes.name !== undefined && !changes.name.trim()) return state;
          if (changes.providerId !== undefined && !changes.providerId) return state;
          if (
            changes.creditLimit !== undefined &&
            (!Number.isFinite(changes.creditLimit) || changes.creditLimit <= 0)
          ) {
            // An empty limit clears it; anything else non-positive is a typo.
            if (changes.creditLimit !== 0) return state;
          }
          return {
            accounts: state.accounts.map(account =>
              account.id === id
                ? {
                    ...account,
                    ...changes,
                    creditLimit: changes.creditLimit === 0 ? undefined : (changes.creditLimit ?? account.creditLimit),
                    name: changes.name?.trim() ?? account.name,
                    updatedAt: new Date().toISOString(),
                  }
                : account,
            ),
          };
        }),
      updateBalance: (id, balance, rateToPhp) =>
        set(state => {
          if (
            !Number.isFinite(balance) ||
            (rateToPhp !== undefined && (!Number.isFinite(rateToPhp) || rateToPhp <= 0))
          ) {
            return state;
          }
          return {
            accounts: state.accounts.map(account =>
              account.id === id
                ? {
                    ...account,
                    balance,
                    rateToPhp: rateToPhp ?? account.rateToPhp,
                    updatedAt: new Date().toISOString(),
                  }
                : account,
            ),
          };
        }),
      postTransaction: (id, type, amountInPhp) =>
        set(state => ({
          accounts: state.accounts.map(account => {
            if (account.id !== id) return account;
            if (!Number.isFinite(amountInPhp) || amountInPhp <= 0) return account;
            const direction =
              account.nature === 'asset'
                ? type === 'income'
                  ? 1
                  : -1
                : type === 'expense'
                  ? 1
                  : -1;
            const rate =
              Number.isFinite(account.rateToPhp) && account.rateToPhp > 0
                ? account.rateToPhp
                : 1;
            const nativeAmount = amountInPhp / rate;
            return {
              ...account,
              // Preserve exact reversibility. Negative asset balances represent
              // overdrafts; negative liabilities represent an account credit.
              balance: account.balance + nativeAmount * direction,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),
      archiveAccount: id =>
        set(state => ({
          accounts: state.accounts.map(account =>
            account.id === id ? {...account, archivedAt: new Date().toISOString()} : account,
          ),
        })),
      restoreAccount: id =>
        set(state => ({
          accounts: state.accounts.map(account =>
            account.id === id ? {...account, archivedAt: undefined} : account,
          ),
        })),
      deleteAccount: id =>
        set(state => ({accounts: state.accounts.filter(account => account.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'accounts', storage: appStorage},
  ),
);
