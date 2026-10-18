import {existsSync} from 'node:fs';
import {dirname, join, resolve as resolvePath} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

/*
 * Test-only resolver.
 *
 * Two jobs, both so the finance logic can be exercised under plain Node:
 *   1. Point React Native native modules at in-memory shims.
 *   2. Add the .ts/.tsx extension that source files omit, since Node's type
 *      stripping does not do extension resolution for ESM.
 */

const here = dirname(fileURLToPath(import.meta.url));

const SHIMS = {
  '@react-native-async-storage/async-storage': join(here, 'shims/async-storage.mjs'),
  'expo-crypto': join(here, 'shims/expo-crypto.mjs'),
  'expo-modules-core': join(here, 'shims/expo-modules-core.mjs'),
  'expo-secure-store': join(here, 'shims/expo-secure-store.mjs'),
  'expo-local-authentication': join(here, 'shims/expo-local-authentication.mjs'),
};

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.mjs'];

export async function resolve(specifier, context, nextResolve) {
  const shim = SHIMS[specifier];
  if (shim) return {url: pathToFileURL(shim).href, shortCircuit: true};

  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    if (!existsSync(base) || !base.match(/\.[a-z]+$/)) {
      const target = EXTENSIONS.map(extension => base + extension).find(candidate =>
        existsSync(candidate),
      );
      if (target) return {url: pathToFileURL(target).href, shortCircuit: true};
    }
  }

  return nextResolve(specifier, context);
}
