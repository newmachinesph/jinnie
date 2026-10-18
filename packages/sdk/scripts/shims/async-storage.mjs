/**
 * In-memory stand-in for AsyncStorage, used only by the regression suite so
 * the store logic can be exercised under plain Node without a device.
 *
 * Mirrors the v3 interface — getMany / setMany / removeMany, not the v1
 * multiGet / multiSet / multiRemove.
 */
const values = new Map();

const AsyncStorage = {
  async getItem(key) {
    return values.has(String(key)) ? values.get(String(key)) : null;
  },
  async setItem(key, value) {
    values.set(String(key), String(value));
  },
  async removeItem(key) {
    values.delete(String(key));
  },
  async getAllKeys() {
    return [...values.keys()];
  },
  async getMany(keys) {
    return Object.fromEntries(keys.map(key => [key, values.get(String(key)) ?? null]));
  },
  async setMany(entries) {
    for (const [key, value] of Object.entries(entries)) values.set(String(key), String(value));
  },
  async removeMany(keys) {
    for (const key of keys) values.delete(String(key));
  },
  async clear() {
    values.clear();
  },
};

export default AsyncStorage;
