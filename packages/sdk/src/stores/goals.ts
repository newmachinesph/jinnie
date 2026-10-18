import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
}

interface GoalsState {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'saved'>) => void;
  /** A lowered target caps what is already saved, so the goal reads as reached. */
  updateGoal: (id: string, changes: Partial<Omit<Goal, 'id' | 'saved'>>) => void;
  contribute: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export const useGoalsStore = create<GoalsState>()(
  persist(
    set => ({
      goals: [],
      addGoal: goal =>
        set(state => {
          if (!goal.name.trim() || !Number.isFinite(goal.target) || goal.target <= 0) {
            return state;
          }
          if (goal.deadline && !DATE_PATTERN.test(goal.deadline)) return state;
          return {
            goals: [
              {...goal, name: goal.name.trim(), id: generateId(), saved: 0},
              ...state.goals,
            ],
          };
        }),
      contribute: (id, amount) =>
        set(state => {
          if (!Number.isFinite(amount) || amount <= 0) return state;
          return {
            goals: state.goals.map(goal =>
              goal.id === id
                ? {...goal, saved: Math.min(goal.saved + amount, goal.target)}
                : goal,
            ),
          };
        }),
      updateGoal: (id, changes) =>
        set(state => {
          if (changes.name !== undefined && !changes.name.trim()) return state;
          if (changes.target !== undefined && (!Number.isFinite(changes.target) || changes.target <= 0)) {
            return state;
          }
          if (changes.deadline && !DATE_PATTERN.test(changes.deadline)) return state;
          return {
            goals: state.goals.map(goal => {
              if (goal.id !== id) return goal;
              const target = changes.target ?? goal.target;
              return {
                ...goal,
                ...changes,
                name: changes.name?.trim() ?? goal.name,
                target,
                saved: Math.min(goal.saved, target),
              };
            }),
          };
        }),
      deleteGoal: id => set(state => ({goals: state.goals.filter(goal => goal.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'goals', storage: appStorage},
  ),
);
