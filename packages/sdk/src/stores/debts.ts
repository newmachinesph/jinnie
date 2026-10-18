import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export type DebtDirection = 'receivable' | 'payable';

export interface Debt {
  id: string;
  person: string;
  amount: number;
  direction: DebtDirection;
  accountId?: string;
  note?: string;
  date: string;
  settledAt?: string;
}

interface DebtsState {
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'date'>) => void;
  updateDebt: (id: string, changes: Partial<Omit<Debt, 'id' | 'date' | 'settledAt'>>) => void;
  settleDebt: (id: string) => void;
  reopenDebt: (id: string) => void;
  deleteDebt: (id: string) => void;
}

export const useDebtsStore = create<DebtsState>()(
  persist(
    set => ({
      debts: [],
      addDebt: debt =>
        set(state => {
          if (!debt.person.trim() || !Number.isFinite(debt.amount) || debt.amount <= 0) {
            return state;
          }
          return {
            debts: [
              {
                ...debt,
                person: debt.person.trim(),
                note: debt.note?.trim() || undefined,
                id: generateId(),
                date: new Date().toISOString(),
              },
              ...state.debts,
            ],
          };
        }),
      updateDebt: (id, changes) =>
        set(state => {
          if (changes.person !== undefined && !changes.person.trim()) return state;
          if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount <= 0)) {
            return state;
          }
          return {
            debts: state.debts.map(debt =>
              debt.id === id
                ? {
                    ...debt,
                    ...changes,
                    person: changes.person?.trim() ?? debt.person,
                    note: changes.note === undefined ? debt.note : changes.note.trim() || undefined,
                  }
                : debt,
            ),
          };
        }),
      settleDebt: id =>
        set(state => ({
          debts: state.debts.map(debt =>
            debt.id === id ? {...debt, settledAt: new Date().toISOString()} : debt,
          ),
        })),
      reopenDebt: id =>
        set(state => ({
          debts: state.debts.map(debt =>
            debt.id === id ? {...debt, settledAt: undefined} : debt,
          ),
        })),
      deleteDebt: id => set(state => ({debts: state.debts.filter(debt => debt.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'debts', storage: appStorage},
  ),
);
