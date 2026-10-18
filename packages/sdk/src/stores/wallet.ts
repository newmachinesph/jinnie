import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface Transaction {
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
}

export type LedgerEntryInput = Omit<Transaction, 'id' | 'date' | 'type' | 'toAccountId'> & {
  type: 'income' | 'expense';
  date?: string;
};

export type TransferInput = {
  amount: number;
  description: string;
  accountId: string;
  toAccountId: string;
  date?: string;
};

interface WalletState {
  transactions: Transaction[];
  addTransaction: (transaction: LedgerEntryInput) => string;
  addTransfer: (transfer: TransferInput) => string;
  updateTransaction: (id: string, changes: Partial<Omit<Transaction, 'id' | 'date'>>) => void;
  deleteTransaction: (id: string) => void;
}

/**
 * The shared Wallet ledger — the platform's single money context. The SDK
 * bridge exposes it to core apps as `host.finance`.
 *
 * Because the SDK is a Module Federation singleton, every federated mini app
 * reads and writes this exact store instance. A second copy would mean a
 * second ledger, which is why `@jinnie/sdk` is shared with `singleton: true`.
 */
export const useWalletStore = create<WalletState>()(
  persist(
    set => ({
      transactions: [],
      addTransaction: transaction => {
        if (
          !Number.isFinite(transaction.amount) ||
          transaction.amount <= 0 ||
          !transaction.description.trim() ||
          !transaction.category.trim()
        ) {
          return '';
        }
        const id = generateId();
        set(state => ({
          transactions: [
            {
              ...transaction,
              description: transaction.description.trim(),
              id,
              date: transaction.date ?? new Date().toISOString(),
            },
            ...state.transactions,
          ],
        }));
        return id;
      },
      addTransfer: transfer => {
        if (
          !Number.isFinite(transfer.amount) ||
          transfer.amount <= 0 ||
          !transfer.description.trim() ||
          !transfer.accountId ||
          !transfer.toAccountId ||
          transfer.accountId === transfer.toAccountId
        ) {
          return '';
        }
        const id = generateId();
        set(state => ({
          transactions: [
            {
              ...transfer,
              description: transfer.description.trim(),
              id,
              type: 'transfer' as const,
              category: 'account_transfer',
              date: transfer.date ?? new Date().toISOString(),
            },
            ...state.transactions,
          ],
        }));
        return id;
      },
      updateTransaction: (id, changes) =>
        set(state => {
          if (
            changes.amount !== undefined &&
            (!Number.isFinite(changes.amount) || changes.amount <= 0)
          ) {
            return state;
          }
          if (changes.description !== undefined && !changes.description.trim()) {
            return state;
          }
          return {
            transactions: state.transactions.map(transaction =>
              transaction.id === id
                ? {
                    ...transaction,
                    ...changes,
                    description: changes.description?.trim() ?? transaction.description,
                  }
                : transaction,
            ),
          };
        }),
      deleteTransaction: id =>
        set(state => ({
          transactions: state.transactions.filter(transaction => transaction.id !== id),
        })),
    }),
    {name: STORAGE_PREFIX + 'wallet', storage: appStorage},
  ),
);
