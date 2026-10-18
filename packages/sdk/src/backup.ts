import {gcm} from '@noble/ciphers/aes.js';
import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes} from '@noble/ciphers/utils.js';
import {getRandomValues} from 'expo-crypto';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {STORAGE_PREFIX, clearAllStorage, readAllStorage, writeAllStorage} from './storage';
import {rehydrateAllStores, resetAllStores} from './stores';

export const BACKUP_PRODUCT = 'Jinnie';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5_000_000;

export interface BackupFile {
  product: typeof BACKUP_PRODUCT;
  version: typeof BACKUP_VERSION;
  exportedAt?: string;
  data: Record<string, string | null>;
}

/** A backup whose data is sealed with a passphrase. Fields are hex. */
export interface EncryptedBackupFile {
  product: typeof BACKUP_PRODUCT;
  version: typeof BACKUP_VERSION;
  encrypted: true;
  exportedAt?: string;
  kdf: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
}

/**
 * PBKDF2-SHA256 runs in the platform's own crypto when the host ships the
 * JinnieCrypto module (Android today): 600,000 rounds, the OWASP figure, in
 * well under a second. Without it, Hermes manages only a few milliseconds per
 * round, so the JavaScript fallback settles for 4,096 rounds. The file records
 * its own round count, so either side opens what the other sealed.
 */
interface NativeCrypto {
  pbkdf2Sha256(password: string, saltHex: string, iterations: number, length: number): Promise<string>;
}
const nativeCrypto = requireOptionalNativeModule<NativeCrypto>('JinnieCrypto');
const ITERATIONS = nativeCrypto ? 600_000 : 4_096;
const MAX_ITERATIONS = 10_000_000;

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const normalized = passphrase.normalize('NFKC');
  if (nativeCrypto) {
    return hexToBytes(await nativeCrypto.pbkdf2Sha256(normalized, bytesToHex(salt), iterations, 32));
  }
  return pbkdf2Async(sha256, utf8ToBytes(normalized), salt, {c: iterations, dkLen: 32});
}

function validExportedAt(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

/**
 * A backup is user-supplied input from outside the app. Every field is checked
 * before a single byte is written back, including the key namespace — a file
 * that claims to be ours must not be able to write outside `jinnie.`.
 */
export function readBackup(value: unknown): BackupFile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BackupFile>;
  if (candidate.product !== BACKUP_PRODUCT || candidate.version !== BACKUP_VERSION) return null;
  if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) {
    return null;
  }
  if (!validExportedAt(candidate.exportedAt)) return null;
  const invalid = Object.entries(candidate.data).some(
    ([key, stored]) =>
      !key.startsWith(STORAGE_PREFIX) || (stored !== null && typeof stored !== 'string'),
  );
  return invalid ? null : (candidate as BackupFile);
}

export function readEncryptedBackup(value: unknown): EncryptedBackupFile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<EncryptedBackupFile>;
  if (candidate.product !== BACKUP_PRODUCT || candidate.version !== BACKUP_VERSION) return null;
  if (candidate.encrypted !== true || candidate.kdf !== 'pbkdf2-sha256') return null;
  if (
    !Number.isInteger(candidate.iterations) ||
    (candidate.iterations as number) < 1 ||
    (candidate.iterations as number) > MAX_ITERATIONS
  ) {
    return null;
  }
  if (!validExportedAt(candidate.exportedAt)) return null;
  const hex = /^[0-9a-f]+$/;
  for (const field of [candidate.salt, candidate.nonce, candidate.ciphertext]) {
    if (typeof field !== 'string' || !hex.test(field) || field.length % 2 !== 0) return null;
  }
  return candidate as EncryptedBackupFile;
}

/** Everything the app persists, as one plain object ready to serialise. */
export async function createBackup(): Promise<BackupFile> {
  return {
    product: BACKUP_PRODUCT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: await readAllStorage(),
  };
}

export async function encryptBackup(
  backup: BackupFile,
  passphrase: string,
): Promise<EncryptedBackupFile> {
  const salt = getRandomValues(new Uint8Array(16));
  const nonce = getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const ciphertext = gcm(key, nonce).encrypt(utf8ToBytes(JSON.stringify(backup.data)));
  return {
    product: BACKUP_PRODUCT,
    version: BACKUP_VERSION,
    encrypted: true,
    exportedAt: backup.exportedAt,
    kdf: 'pbkdf2-sha256',
    iterations: ITERATIONS,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

/** `null` when the passphrase is wrong or the file was altered. */
export async function decryptBackup(
  file: EncryptedBackupFile,
  passphrase: string,
): Promise<BackupFile | null> {
  try {
    const key = await deriveKey(passphrase, hexToBytes(file.salt), file.iterations);
    const plain = gcm(key, hexToBytes(file.nonce)).decrypt(hexToBytes(file.ciphertext));
    return readBackup({
      product: BACKUP_PRODUCT,
      version: BACKUP_VERSION,
      exportedAt: file.exportedAt,
      data: JSON.parse(bytesToUtf8(plain)) as unknown,
    });
  } catch {
    return null;
  }
}

export type ParsedBackup =
  | {kind: 'plain'; backup: BackupFile}
  | {kind: 'encrypted'; file: EncryptedBackupFile};

/** Classify a backup file's text without trusting a byte of it. */
export function parseBackupText(text: string): ParsedBackup | null {
  if (text.length > MAX_BACKUP_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const encrypted = readEncryptedBackup(value);
  if (encrypted) return {kind: 'encrypted', file: encrypted};
  const backup = readBackup(value);
  return backup ? {kind: 'plain', backup} : null;
}

/**
 * Replace every local record with the backup's. Snapshots first: a failed
 * write must not leave the device with neither the old records nor the new.
 * Resolves `false` when the restore failed and the previous data was put back.
 *
 * Every store is reset in memory before rehydrating: a store the backup does
 * not mention has no key to read, and rehydration would otherwise leave its
 * current records in place beside the restored ones.
 */
export async function restoreBackup(backup: BackupFile): Promise<boolean> {
  const previous = await readAllStorage();
  const load = async (data: Record<string, string | null>) => {
    await resetAllStores();
    // Mini apps also own plain namespaced keys (for example Learn progress).
    // A replacement backup must remove keys it does not contain.
    await clearAllStorage();
    await writeAllStorage(data);
    await rehydrateAllStores();
  };
  try {
    await load(backup.data);
    return true;
  } catch {
    try {
      await load(previous);
    } catch {}
    return false;
  }
}
