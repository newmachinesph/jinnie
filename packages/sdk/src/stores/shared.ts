import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

/**
 * Community app data: a shared expense pool (a trip, a flat, a household)
 * where members pay for things and the app keeps score of who owes whom.
 */
export interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  /** Members who share this cost equally. Always includes at least one. */
  splitAmong: string[];
  /** A settlement is money handed from paidBy to the one member in splitAmong. */
  settlement?: boolean;
  date: string;
}

export interface SharedPool {
  id: string;
  name: string;
  members: string[];
  expenses: SharedExpense[];
}

type PoolInput = Pick<SharedPool, 'name' | 'members'>;
type ExpenseInput = Omit<SharedExpense, 'id' | 'date' | 'settlement'> & {date?: string};

interface SharedState {
  pools: SharedPool[];
  addPool: (pool: PoolInput) => void;
  updatePool: (id: string, changes: Partial<PoolInput>) => void;
  deletePool: (id: string) => void;
  addExpense: (poolId: string, expense: ExpenseInput) => void;
  updateExpense: (poolId: string, id: string, changes: Partial<Omit<ExpenseInput, 'date'>>) => void;
  deleteExpense: (poolId: string, id: string) => void;
  /** Record that `from` handed `amount` to `to`. */
  settleUp: (poolId: string, from: string, to: string, amount: number) => void;
}

const cleanMembers = (members: string[]) => [
  ...new Set(members.map(member => member.trim()).filter(Boolean)),
];

/**
 * Net position per member: positive means the pool owes them, negative means
 * they owe the pool. Always sums to zero.
 */
export function poolBalances(pool: SharedPool): Record<string, number> {
  const balances: Record<string, number> = Object.fromEntries(pool.members.map(m => [m, 0]));
  for (const expense of pool.expenses) {
    const sharers = expense.splitAmong.filter(member => member in balances);
    if (sharers.length === 0 || !(expense.paidBy in balances)) continue;
    balances[expense.paidBy] += expense.amount;
    const share = expense.amount / sharers.length;
    for (const member of sharers) balances[member] -= share;
  }
  return balances;
}

/** The fewest transfers that zero every balance, largest debtor to largest creditor first. */
export function settlementPlan(
  balances: Record<string, number>,
): {from: string; to: string; amount: number}[] {
  const debtors = Object.entries(balances)
    .filter(([, net]) => net < -0.005)
    .map(([member, net]) => ({member, owed: -net}))
    .sort((a, b) => b.owed - a.owed);
  const creditors = Object.entries(balances)
    .filter(([, net]) => net > 0.005)
    .map(([member, net]) => ({member, due: net}))
    .sort((a, b) => b.due - a.due);
  const plan: {from: string; to: string; amount: number}[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].owed, creditors[j].due);
    plan.push({from: debtors[i].member, to: creditors[j].member, amount});
    debtors[i].owed -= amount;
    creditors[j].due -= amount;
    if (debtors[i].owed <= 0.005) i += 1;
    if (creditors[j].due <= 0.005) j += 1;
  }
  return plan;
}

function validExpense(expense: Partial<ExpenseInput>, members: string[]): boolean {
  if (expense.description !== undefined && !expense.description.trim()) return false;
  if (expense.amount !== undefined && (!Number.isFinite(expense.amount) || expense.amount <= 0)) {
    return false;
  }
  if (expense.paidBy !== undefined && !members.includes(expense.paidBy)) return false;
  if (
    expense.splitAmong !== undefined &&
    (expense.splitAmong.length === 0 || !expense.splitAmong.every(member => members.includes(member)))
  ) {
    return false;
  }
  return true;
}

export const useSharedStore = create<SharedState>()(
  persist(
    set => ({
      pools: [],
      addPool: pool =>
        set(state => {
          const members = cleanMembers(pool.members);
          if (!pool.name.trim() || members.length < 2) return state;
          return {
            pools: [...state.pools, {id: generateId(), name: pool.name.trim(), members, expenses: []}],
          };
        }),
      updatePool: (id, changes) =>
        set(state => {
          if (changes.name !== undefined && !changes.name.trim()) return state;
          const members = changes.members ? cleanMembers(changes.members) : undefined;
          if (members && members.length < 2) return state;
          return {
            pools: state.pools.map(pool => {
              if (pool.id !== id) return pool;
              const nextMembers = members ?? pool.members;
              // A member with history cannot be dropped, or the score no longer sums to zero.
              const referenced = new Set(pool.expenses.flatMap(e => [e.paidBy, ...e.splitAmong]));
              if ([...referenced].some(member => !nextMembers.includes(member))) return pool;
              return {...pool, name: changes.name?.trim() ?? pool.name, members: nextMembers};
            }),
          };
        }),
      deletePool: id => set(state => ({pools: state.pools.filter(pool => pool.id !== id)})),
      addExpense: (poolId, expense) =>
        set(state => ({
          pools: state.pools.map(pool => {
            if (pool.id !== poolId || !validExpense(expense, pool.members)) return pool;
            return {
              ...pool,
              expenses: [
                {
                  ...expense,
                  description: expense.description.trim(),
                  id: generateId(),
                  date: expense.date ?? new Date().toISOString(),
                },
                ...pool.expenses,
              ],
            };
          }),
        })),
      updateExpense: (poolId, id, changes) =>
        set(state => ({
          pools: state.pools.map(pool => {
            if (pool.id !== poolId || !validExpense(changes, pool.members)) return pool;
            return {
              ...pool,
              expenses: pool.expenses.map(expense =>
                expense.id === id
                  ? {...expense, ...changes, description: changes.description?.trim() ?? expense.description}
                  : expense,
              ),
            };
          }),
        })),
      deleteExpense: (poolId, id) =>
        set(state => ({
          pools: state.pools.map(pool =>
            pool.id === poolId
              ? {...pool, expenses: pool.expenses.filter(expense => expense.id !== id)}
              : pool,
          ),
        })),
      settleUp: (poolId, from, to, amount) =>
        set(state => ({
          pools: state.pools.map(pool => {
            if (
              pool.id !== poolId ||
              from === to ||
              !pool.members.includes(from) ||
              !pool.members.includes(to) ||
              !Number.isFinite(amount) ||
              amount <= 0
            ) {
              return pool;
            }
            return {
              ...pool,
              expenses: [
                {
                  id: generateId(),
                  description: `${from} paid ${to}`,
                  amount,
                  paidBy: from,
                  splitAmong: [to],
                  settlement: true,
                  date: new Date().toISOString(),
                },
                ...pool.expenses,
              ],
            };
          }),
        })),
    }),
    {name: `${STORAGE_PREFIX}shared`, storage: appStorage},
  ),
);
