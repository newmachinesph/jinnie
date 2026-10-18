import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface BudgetLimit {
  id: string;
  categoryId: string;
  limit: number;
}

interface BudgetState {
  limits: BudgetLimit[];
  upsertLimit: (categoryId: string, limit: number) => void;
  deleteLimit: (id: string) => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    set => ({
      limits: [],
      upsertLimit: (categoryId, limit) =>
        set(state => {
          if (!categoryId.trim() || !Number.isFinite(limit) || limit <= 0) return state;
          const existing = state.limits.find(item => item.categoryId === categoryId);
          if (existing) {
            return {
              limits: state.limits.map(item =>
                item.id === existing.id ? {...item, limit} : item,
              ),
            };
          }
          return {limits: [...state.limits, {id: generateId(), categoryId, limit}]};
        }),
      deleteLimit: id =>
        set(state => ({limits: state.limits.filter(item => item.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'budget', storage: appStorage},
  ),
);
