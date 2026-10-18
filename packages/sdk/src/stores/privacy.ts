import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {appStorage, STORAGE_PREFIX} from '../storage';

interface PrivacyState {
  /** Replace every balance and amount with dots, across every app. */
  valuesHidden: boolean;
  toggleValues: () => void;
  setValuesHidden: (hidden: boolean) => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    set => ({
      valuesHidden: false,
      toggleValues: () => set(state => ({valuesHidden: !state.valuesHidden})),
      setValuesHidden: hidden => set({valuesHidden: hidden}),
    }),
    {name: STORAGE_PREFIX + 'privacy', storage: appStorage},
  ),
);

export function usePrivacy() {
  const valuesHidden = usePrivacyStore(state => state.valuesHidden);
  const toggleValues = usePrivacyStore(state => state.toggleValues);
  return {valuesHidden, toggleValues};
}
