import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage} from 'zustand/middleware';

/**
 * Every persisted key in the product lives under this prefix. Backup export,
 * restore, and "delete local data" all enumerate by it, so nothing may be
 * written outside it.
 */
export const STORAGE_PREFIX = 'jinnie.';

/** Backing store for every `persist(...)` in the SDK. */
export const appStorage = createJSONStorage(() => AsyncStorage);

export async function allStorageKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(key => key.startsWith(STORAGE_PREFIX));
  } catch {
    return [];
  }
}

export async function readAllStorage(): Promise<Record<string, string | null>> {
  const keys = await allStorageKeys();
  if (keys.length === 0) return {};
  try {
    return await AsyncStorage.getMany(keys);
  } catch {
    return {};
  }
}

export async function clearAllStorage(): Promise<void> {
  const keys = await allStorageKeys();
  if (keys.length > 0) await AsyncStorage.removeMany(keys);
}

export async function writeAllStorage(
  data: Record<string, string | null>,
): Promise<void> {
  // A backup may legitimately record a key as null. There is nothing to write
  // for those, and setMany does not accept them.
  const entries = Object.fromEntries(
    Object.entries(data).filter((entry): entry is [string, string] => entry[1] !== null),
  );
  if (Object.keys(entries).length > 0) await AsyncStorage.setMany(entries);
}

/** Simple key–value access for the host's own preferences. */
export const preferences = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {}
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
    } catch {}
  },
};

/**
 * Storage handed to a mini app through the bridge. Namespaced to the app id so
 * one app can never read or overwrite another's records.
 */
export function namespacedStorage(appId: string) {
  const prefix = `${STORAGE_PREFIX}${appId}.`;
  return {
    async get(key: string): Promise<string | null> {
      try {
        return await AsyncStorage.getItem(prefix + key);
      } catch {
        return null;
      }
    },
    async set(key: string, value: string): Promise<void> {
      try {
        await AsyncStorage.setItem(prefix + key, value);
      } catch {}
    },
    async remove(key: string): Promise<void> {
      try {
        await AsyncStorage.removeItem(prefix + key);
      } catch {}
    },
  };
}
