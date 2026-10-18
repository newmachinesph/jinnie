import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {generateId} from '../utils';
import {appStorage, STORAGE_PREFIX} from '../storage';

export type UserEntryKind = 'category' | 'institution' | 'biller';

/**
 * A catalog entry the user typed in because the built-in list lacked it.
 * It is saved once and offered again in every picker of its kind, so
 * "Other" never has to be typed twice.
 */
export interface UserEntry {
  id: string;
  kind: UserEntryKind;
  label: string;
  /** Categories only: which side of the ledger they belong to. */
  group?: 'expense' | 'income';
  /** Billers only: the bill category they were created under. */
  categoryId?: string;
  createdAt: string;
}

interface CatalogState {
  entries: UserEntry[];
  /** Returns the entry id — the existing one when the label is already known for that kind. */
  addEntry: (entry: Omit<UserEntry, 'id' | 'createdAt'>) => string;
  renameEntry: (id: string, label: string) => void;
  removeEntry: (id: string) => void;
}

export const USER_ENTRY_PREFIX = 'user-';
export const MAX_ENTRY_LABEL = 40;

export function isUserEntry(id: string): boolean {
  return id.startsWith(USER_ENTRY_PREFIX);
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: entry => {
        const label = entry.label.trim().slice(0, MAX_ENTRY_LABEL);
        if (!label) return '';
        const existing = get().entries.find(
          item =>
            item.kind === entry.kind &&
            item.group === entry.group &&
            item.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
        );
        if (existing) return existing.id;
        const id = `${USER_ENTRY_PREFIX}${entry.kind}-${generateId()}`;
        set(state => ({
          entries: [...state.entries, {...entry, label, id, createdAt: new Date().toISOString()}],
        }));
        return id;
      },
      renameEntry: (id, label) =>
        set(state => {
          const next = label.trim().slice(0, MAX_ENTRY_LABEL);
          if (!next) return state;
          return {entries: state.entries.map(item => (item.id === id ? {...item, label: next} : item))};
        }),
      removeEntry: id => set(state => ({entries: state.entries.filter(item => item.id !== id)})),
    }),
    {name: STORAGE_PREFIX + 'catalog', storage: appStorage},
  ),
);
