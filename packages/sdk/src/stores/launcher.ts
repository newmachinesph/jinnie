import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {appStorage, STORAGE_PREFIX} from '../storage';

/**
 * Apps the launcher always shows: the three with a tab of their own, and
 * Security, which holds the controls over the records themselves. Settings
 * is never listed; it opens from the shell's gear.
 */
export const FIXED_APPS: readonly string[] = ['wallet', 'accounts', 'bills', 'security'];

interface LauncherState {
  /** Ids the user has hidden from the launcher. Everything else shows. */
  hidden: string[];
  setHidden: (id: string, hidden: boolean) => void;
}

export const useLauncherStore = create<LauncherState>()(
  persist(
    set => ({
      hidden: [],
      setHidden: (id, hidden) =>
        set(state => {
          if (FIXED_APPS.includes(id)) return state;
          const rest = state.hidden.filter(item => item !== id);
          return {hidden: hidden ? [...rest, id] : rest};
        }),
    }),
    {name: STORAGE_PREFIX + 'launcher', storage: appStorage},
  ),
);
