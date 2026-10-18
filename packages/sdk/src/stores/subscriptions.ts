import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export type SubscriptionCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  /** Catalog biller or user entry, when the service is a known brand. */
  billerId?: string;
  amount: number;
  cycle: SubscriptionCycle;
  /** 'YYYY-MM-DD' of the next charge. */
  nextRenewal: string;
  paymentAccountId?: string;
  /** Set while the service is paused; renewals are not expected. */
  pausedAt?: string;
  /** Wallet transaction generated for the latest renewal. */
  lastRenewalTransactionId?: string;
}

type SubscriptionInput = Omit<Subscription, 'id' | 'pausedAt' | 'lastRenewalTransactionId'>;

interface SubscriptionsState {
  subscriptions: Subscription[];
  addSubscription: (subscription: SubscriptionInput) => void;
  updateSubscription: (id: string, changes: Partial<SubscriptionInput>) => void;
  /** Advance the renewal date by one cycle. Wallet posting is the app's job. */
  markRenewed: (id: string, transactionId?: string) => void;
  pauseSubscription: (id: string) => void;
  resumeSubscription: (id: string, nextRenewal: string) => void;
  deleteSubscription: (id: string) => void;
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

/** One cycle later, clamped to the last day of the target month (Jan 31 → Feb 28). */
export function nextRenewalAfter(date: string, cycle: SubscriptionCycle): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetMonth = month + (cycle === 'monthly' ? 1 : 12); // 1-based
  const lastDay = new Date(year, targetMonth, 0).getDate(); // day 0 of next month
  const next = new Date(year, targetMonth - 1, Math.min(day, lastDay), 12);
  return next.toISOString().slice(0, 10);
}

/** Monthly cost of a subscription regardless of its billing cycle. */
export function monthlyCost(subscription: Pick<Subscription, 'amount' | 'cycle'>): number {
  return subscription.cycle === 'yearly' ? subscription.amount / 12 : subscription.amount;
}

function valid(changes: Partial<SubscriptionInput>): boolean {
  if (changes.name !== undefined && !changes.name.trim()) return false;
  if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount <= 0)) {
    return false;
  }
  if (changes.nextRenewal !== undefined && !DATE_PATTERN.test(changes.nextRenewal)) return false;
  return true;
}

export const useSubscriptionsStore = create<SubscriptionsState>()(
  persist(
    set => ({
      subscriptions: [],
      addSubscription: subscription =>
        set(state => {
          if (!valid(subscription) || !subscription.name || !subscription.nextRenewal) return state;
          return {
            subscriptions: [
              ...state.subscriptions,
              {...subscription, name: subscription.name.trim(), id: generateId()},
            ],
          };
        }),
      updateSubscription: (id, changes) =>
        set(state => {
          if (!valid(changes)) return state;
          return {
            subscriptions: state.subscriptions.map(item =>
              item.id === id ? {...item, ...changes, name: changes.name?.trim() ?? item.name} : item,
            ),
          };
        }),
      markRenewed: (id, transactionId) =>
        set(state => ({
          subscriptions: state.subscriptions.map(item =>
            item.id === id
              ? {
                  ...item,
                  nextRenewal: nextRenewalAfter(item.nextRenewal, item.cycle),
                  lastRenewalTransactionId: transactionId ?? item.lastRenewalTransactionId,
                }
              : item,
          ),
        })),
      pauseSubscription: id =>
        set(state => ({
          subscriptions: state.subscriptions.map(item =>
            item.id === id ? {...item, pausedAt: new Date().toISOString()} : item,
          ),
        })),
      resumeSubscription: (id, nextRenewal) =>
        set(state => {
          if (!DATE_PATTERN.test(nextRenewal)) return state;
          return {
            subscriptions: state.subscriptions.map(item =>
              item.id === id ? {...item, pausedAt: undefined, nextRenewal} : item,
            ),
          };
        }),
      deleteSubscription: id =>
        set(state => ({subscriptions: state.subscriptions.filter(item => item.id !== id)})),
    }),
    {name: `${STORAGE_PREFIX}subscriptions`, storage: appStorage},
  ),
);
