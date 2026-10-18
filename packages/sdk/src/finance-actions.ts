import {useAccountsStore} from './stores/accounts';
import {useBillsStore} from './stores/bills';
import {useWalletStore} from './stores/wallet';

interface TransactionInput {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  accountId?: string;
  billId?: string;
  billPeriod?: string;
}

interface TransferInput {
  amount: number;
  description: string;
  fromAccountId: string;
  toAccountId: string;
}

type TransactionChanges = Omit<TransactionInput, 'billId' | 'billPeriod'>;

function activeAccountExists(id: string): boolean {
  return useAccountsStore
    .getState()
    .accounts.some(account => account.id === id && !account.archivedAt);
}

/**
 * The reviewed money mutations. The host bridge exposes these to core apps as
 * `host.finance`, and the regression suite calls them directly, so both go
 * through exactly one implementation.
 */
export const financeActions = {
  addTransaction(transaction: TransactionInput): string {
    if (
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0 ||
      !transaction.description.trim() ||
      !transaction.category.trim()
    ) {
      return '';
    }
    if (transaction.accountId && !activeAccountExists(transaction.accountId)) return '';

    const id = useWalletStore.getState().addTransaction({
      ...transaction,
      description: transaction.description.trim(),
    });
    if (!id) return '';
    if (transaction.accountId) {
      useAccountsStore
        .getState()
        .postTransaction(transaction.accountId, transaction.type, transaction.amount);
    }
    return id;
  },

  transferBetweenAccounts(transfer: TransferInput): string {
    if (
      !Number.isFinite(transfer.amount) ||
      transfer.amount <= 0 ||
      !transfer.description.trim() ||
      transfer.fromAccountId === transfer.toAccountId
    ) {
      return '';
    }
    if (
      !activeAccountExists(transfer.fromAccountId) ||
      !activeAccountExists(transfer.toAccountId)
    ) {
      return '';
    }

    const id = useWalletStore.getState().addTransfer({
      amount: transfer.amount,
      description: transfer.description.trim(),
      accountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
    });
    if (!id) return '';
    useAccountsStore.getState().postTransaction(transfer.fromAccountId, 'expense', transfer.amount);
    useAccountsStore.getState().postTransaction(transfer.toAccountId, 'income', transfer.amount);
    return id;
  },

  updateTransaction(id: string, changes: TransactionChanges): void {
    if (
      !Number.isFinite(changes.amount) ||
      changes.amount <= 0 ||
      !changes.description.trim() ||
      !changes.category.trim()
    ) {
      return;
    }
    const wallet = useWalletStore.getState();
    const previous = wallet.transactions.find(transaction => transaction.id === id);
    if (!previous || previous.type === 'transfer') return;
    if (previous.billId && changes.type !== 'expense') return;
    if (changes.accountId && !activeAccountExists(changes.accountId)) return;

    if (previous.accountId) {
      useAccountsStore
        .getState()
        .postTransaction(
          previous.accountId,
          previous.type === 'income' ? 'expense' : 'income',
          previous.amount,
        );
    }
    wallet.updateTransaction(id, {...changes, description: changes.description.trim()});
    if (changes.accountId) {
      useAccountsStore
        .getState()
        .postTransaction(changes.accountId, changes.type, changes.amount);
    }
  },

  deleteTransaction(id: string): void {
    const wallet = useWalletStore.getState();
    const transaction = wallet.transactions.find(item => item.id === id);
    if (!transaction) return;

    if (transaction.type === 'transfer') {
      if (transaction.accountId) {
        useAccountsStore
          .getState()
          .postTransaction(transaction.accountId, 'income', transaction.amount);
      }
      if (transaction.toAccountId) {
        useAccountsStore
          .getState()
          .postTransaction(transaction.toAccountId, 'expense', transaction.amount);
      }
    } else if (transaction.accountId) {
      useAccountsStore
        .getState()
        .postTransaction(
          transaction.accountId,
          transaction.type === 'income' ? 'expense' : 'income',
          transaction.amount,
        );
    }
    wallet.deleteTransaction(id);
    if (transaction.billId) {
      useBillsStore.getState().markUnpaid(transaction.billId, transaction.billPeriod);
    }
  },
};
