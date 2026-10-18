// Tests run under Node: no native modules exist, so every lookup misses and
// callers take their JavaScript fallback.
export function requireOptionalNativeModule() {
  return null;
}
