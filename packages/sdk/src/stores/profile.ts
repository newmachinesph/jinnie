import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {appStorage, STORAGE_PREFIX} from '../storage';

interface ProfileState {
  /** What the shell calls the user. Collected during onboarding; never leaves the device. */
  name: string;
  setName: (name: string) => void;
}

export const MAX_PROFILE_NAME = 40;

export const useProfileStore = create<ProfileState>()(
  persist(
    set => ({
      name: '',
      setName: name =>
        set(state => {
          const trimmed = name.trim().slice(0, MAX_PROFILE_NAME);
          return trimmed ? {name: trimmed} : state;
        }),
    }),
    {name: STORAGE_PREFIX + 'profile', storage: appStorage},
  ),
);
