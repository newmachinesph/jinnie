import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface Bill {
  id: string;
  name: string;
  billerId?: string;
  categoryId?: string;
  paymentAccountId?: string;
  amount: number;
  /** Day of month the bill is due (1 to 31). */
  dueDay: number;
  /** 'YYYY-MM' of the last period marked paid. */
  lastPaidPeriod?: string;
  /** Wallet transaction generated for the latest paid period. */
  lastPaymentTransactionId?: string;
}

interface BillsState {
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id'>) => void;
  /** Details only; paid state is owned by markPaid/markUnpaid. */
  updateBill: (
    id: string,
    changes: Partial<Omit<Bill, 'id' | 'lastPaidPeriod' | 'lastPaymentTransactionId'>>,
  ) => void;
  deleteBill: (id: string) => void;
  markPaid: (id: string, period: string, transactionId?: string) => void;
  markUnpaid: (id: string, period?: string) => void;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const useBillsStore = create<BillsState>()(
  persist(
    set => ({
      bills: [],
      addBill: bill =>
        set(state => {
          if (
            !bill.name.trim() ||
            !Number.isFinite(bill.amount) ||
            bill.amount <= 0 ||
            !Number.isInteger(bill.dueDay) ||
            bill.dueDay < 1 ||
            bill.dueDay > 31
          ) {
            return state;
          }
          return {
            bills: [...state.bills, {...bill, name: bill.name.trim(), id: generateId()}],
          };
        }),
      updateBill: (id, changes) =>
        set(state => {
          if (changes.name !== undefined && !changes.name.trim()) return state;
          if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount <= 0)) {
            return state;
          }
          if (
            changes.dueDay !== undefined &&
            (!Number.isInteger(changes.dueDay) || changes.dueDay < 1 || changes.dueDay > 31)
          ) {
            return state;
          }
          return {
            bills: state.bills.map(bill =>
              bill.id === id ? {...bill, ...changes, name: changes.name?.trim() ?? bill.name} : bill,
            ),
          };
        }),
      deleteBill: id => set(state => ({bills: state.bills.filter(bill => bill.id !== id)})),
      markPaid: (id, period, transactionId) =>
        set(state => {
          if (!PERIOD_PATTERN.test(period)) return state;
          return {
            bills: state.bills.map(bill =>
              bill.id === id
                ? {
                    ...bill,
                    lastPaidPeriod: period,
                    lastPaymentTransactionId: transactionId,
                  }
                : bill,
            ),
          };
        }),
      markUnpaid: (id, period) =>
        set(state => ({
          bills: state.bills.map(bill =>
            bill.id === id && (!period || bill.lastPaidPeriod === period)
              ? {...bill, lastPaidPeriod: undefined, lastPaymentTransactionId: undefined}
              : bill,
          ),
        })),
    }),
    {name: STORAGE_PREFIX + 'bills', storage: appStorage},
  ),
);
