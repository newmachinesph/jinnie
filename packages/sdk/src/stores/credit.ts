import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {appStorage, STORAGE_PREFIX} from '../storage';

/**
 * Statement terms for a credit card in Accounts. The balance and limit live
 * on the account itself; this only remembers when statements cut and fall due.
 */
export interface CreditTerms {
  accountId: string;
  /** Day of month the statement is generated (1 to 31). */
  statementDay: number;
  /** Day of month payment is due (1 to 31). */
  dueDay: number;
  /** Optional annual interest rate, as a percentage. */
  interestRate?: number;
}

interface CreditState {
  terms: CreditTerms[];
  setTerms: (terms: CreditTerms) => void;
  removeTerms: (accountId: string) => void;
}

const validDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;

/** Days until the given day of month next occurs; 0 means today. */
export function daysUntilDay(day: number, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let offset = 0; offset < 2; offset += 1) {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate();
    const candidate = new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, lastDay));
    if (candidate >= today) return Math.round((candidate.getTime() - today.getTime()) / 86400000);
  }
  return 0;
}

/** Utilisation as a percentage of the limit; 0 when there is no limit. */
export function utilisation(balance: number, creditLimit?: number): number {
  if (!creditLimit || creditLimit <= 0) return 0;
  return Math.min(100, Math.max(0, (balance / creditLimit) * 100));
}

export const useCreditStore = create<CreditState>()(
  persist(
    set => ({
      terms: [],
      setTerms: terms =>
        set(state => {
          if (!terms.accountId || !validDay(terms.statementDay) || !validDay(terms.dueDay)) {
            return state;
          }
          if (
            terms.interestRate !== undefined &&
            (!Number.isFinite(terms.interestRate) || terms.interestRate < 0)
          ) {
            return state;
          }
          return {
            terms: [...state.terms.filter(item => item.accountId !== terms.accountId), terms],
          };
        }),
      removeTerms: accountId =>
        set(state => ({terms: state.terms.filter(item => item.accountId !== accountId)})),
    }),
    {name: `${STORAGE_PREFIX}credit`, storage: appStorage},
  ),
);
