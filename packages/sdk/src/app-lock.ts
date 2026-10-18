import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex, hexToBytes, utf8ToBytes} from '@noble/hashes/utils.js';
import {getRandomValues} from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/*
 * App lock: a PIN the host asks for on launch and after time in the
 * background, with the device's fingerprint or face as a shortcut. The PIN
 * never leaves the device and is stored only as a salted hash in the platform
 * keystore, never in AsyncStorage where a backup would carry it.
 *
 * ponytail: salted SHA-256, not a slow KDF. Hermes runs scrypt and PBKDF2 at
 * roughly 1.5 ms per round, so anything brute-force resistant would take a
 * minute to unlock, and a 4 to 8 digit PIN cannot resist an offline search
 * anyway. The keystore, not the hash, is what keeps the PIN private.
 */

const PIN_KEY = 'jinnie.lock.pin';
const BIOMETRIC_KEY = 'jinnie.lock.biometric';

export const PIN_LENGTH = {min: 4, max: 8};

export function validPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_LENGTH.min && pin.length <= PIN_LENGTH.max;
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const material = new Uint8Array(salt.length + pin.length);
  material.set(salt);
  material.set(utf8ToBytes(pin), salt.length);
  return bytesToHex(sha256(material));
}

// A picker or share sheet is the app's own doing; time spent there must not
// count as time away. Cleared the next time the app is active again.
let externalActivityUntil = 0;

export const appLock = {
  /** Call right before launching a system picker, share sheet, or browser. */
  expectExternalActivity(forMs = 5 * 60_000): void {
    externalActivityUntil = Date.now() + forMs;
  },

  isExternalActivityExpected(): boolean {
    return Date.now() < externalActivityUntil;
  },

  clearExternalActivity(): void {
    externalActivityUntil = 0;
  },

  async isEnabled(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(PIN_KEY)) !== null;
    } catch {
      return false;
    }
  },

  async setPin(pin: string): Promise<boolean> {
    if (!validPin(pin)) return false;
    const salt = getRandomValues(new Uint8Array(16));
    await SecureStore.setItemAsync(PIN_KEY, `${bytesToHex(salt)}:${await hashPin(pin, salt)}`);
    return true;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (!stored) return false;
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    return (await hashPin(pin, hexToBytes(salt))) === hash;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  },

  async biometricAvailable(): Promise<boolean> {
    try {
      return (
        (await LocalAuthentication.hasHardwareAsync()) &&
        (await LocalAuthentication.isEnrolledAsync())
      );
    } catch {
      return false;
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === 'true';
    } catch {
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (enabled) await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
    else await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  },

  /** Prompt with the device's own biometric UI. `false` on cancel or failure. */
  async authenticateBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Jinnie',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      return result.success;
    } catch {
      return false;
    }
  },
};
