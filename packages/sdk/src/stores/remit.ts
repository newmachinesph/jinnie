import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export type RemittanceDirection = 'sent' | 'received';

export interface Remittance {
  id: string;
  direction: RemittanceDirection;
  person: string;
  channel: string;
  amount: number;
  fee: number;
  date: string;
}

interface RemitState {
  entries: Remittance[];
  addEntry: (entry: Omit<Remittance, 'id' | 'date'>) => void;
  updateEntry: (id: string, changes: Partial<Omit<Remittance, 'id' | 'date'>>) => void;
  deleteEntry: (id: string) => void;
}

export const useRemitStore = create<RemitState>()(
  persist(
    set => ({
      entries: [],
      addEntry: entry =>
        set(state => {
          if (
            !entry.person.trim() ||
            !entry.channel.trim() ||
            !Number.isFinite(entry.amount) ||
            entry.amount <= 0 ||
            !Number.isFinite(entry.fee) ||
            entry.fee < 0
          ) {
            return state;
          }
          return {
            entries: [
              {
                ...entry,
                person: entry.person.trim(),
                channel: entry.channel.trim(),
                id: generateId(),
                date: new Date().toISOString(),
              },
              ...state.entries,
            ],
          };
        }),
      updateEntry: (id, changes) =>
        set(state => {
          if (changes.person !== undefined && !changes.person.trim()) return state;
          if (changes.channel !== undefined && !changes.channel.trim()) return state;
          if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount <= 0)) {
            return state;
          }
          if (changes.fee !== undefined && (!Number.isFinite(changes.fee) || changes.fee < 0)) return state;
          return {
            entries: state.entries.map(entry =>
              entry.id === id
                ? {
                    ...entry,
                    ...changes,
                    person: changes.person?.trim() ?? entry.person,
                    channel: changes.channel?.trim() ?? entry.channel,
                  }
                : entry,
            ),
          };
        }),
      deleteEntry: id =>
        set(state => ({entries: state.entries.filter(entry => entry.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'remit', storage: appStorage},
  ),
);
