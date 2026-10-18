import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export interface Circle {
  id: string;
  name: string;
  /** Contribution per member per round. */
  amount: number;
  /** Payout order = list order. */
  members: string[];
  /** Index of the member receiving the next payout. */
  currentRound: number;
  frequency: 'weekly' | 'monthly';
}

interface CirclesState {
  circles: Circle[];
  addCircle: (circle: Omit<Circle, 'id' | 'currentRound'>) => void;
  /** Members may change mid-cycle; the round pointer stays within the new list. */
  updateCircle: (id: string, changes: Partial<Omit<Circle, 'id' | 'currentRound'>>) => void;
  advanceRound: (id: string) => void;
  rewindRound: (id: string) => void;
  deleteCircle: (id: string) => void;
}

export const useCirclesStore = create<CirclesState>()(
  persist(
    set => ({
      circles: [],
      addCircle: circle =>
        set(state => {
          const members = [
            ...new Set(circle.members.map(member => member.trim()).filter(Boolean)),
          ];
          if (
            !circle.name.trim() ||
            !Number.isFinite(circle.amount) ||
            circle.amount <= 0 ||
            members.length < 2
          ) {
            return state;
          }
          return {
            circles: [
              {...circle, name: circle.name.trim(), members, id: generateId(), currentRound: 0},
              ...state.circles,
            ],
          };
        }),
      updateCircle: (id, changes) =>
        set(state => {
          if (changes.name !== undefined && !changes.name.trim()) return state;
          if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount <= 0)) {
            return state;
          }
          const members = changes.members
            ? [...new Set(changes.members.map(member => member.trim()).filter(Boolean))]
            : undefined;
          if (members && members.length < 2) return state;
          return {
            circles: state.circles.map(circle => {
              if (circle.id !== id) return circle;
              const nextMembers = members ?? circle.members;
              return {
                ...circle,
                ...changes,
                name: changes.name?.trim() ?? circle.name,
                members: nextMembers,
                currentRound: Math.min(circle.currentRound, nextMembers.length),
              };
            }),
          };
        }),
      advanceRound: id =>
        set(state => ({
          circles: state.circles.map(circle =>
            circle.id === id
              ? {...circle, currentRound: Math.min(circle.currentRound + 1, circle.members.length)}
              : circle,
          ),
        })),
      rewindRound: id =>
        set(state => ({
          circles: state.circles.map(circle =>
            circle.id === id
              ? {...circle, currentRound: Math.max(circle.currentRound - 1, 0)}
              : circle,
          ),
        })),
      deleteCircle: id =>
        set(state => ({circles: state.circles.filter(circle => circle.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'circles', storage: appStorage},
  ),
);
