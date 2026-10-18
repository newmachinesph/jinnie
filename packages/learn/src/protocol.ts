/** The course can persist learning progress, open a sibling app, or share a file. */
export const LEARN_APPS = ['wallet', 'budget', 'accounts', 'credit', 'debts', 'circles', 'remit', 'goals', 'bills'] as const;
export const MAX_STATE_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = Math.ceil(MAX_FILE_BYTES * 4 / 3) + 4096;

export type LearnRequest = {
  source: 'jinnie-learn';
  id: string;
  type: 'ready' | 'saveState' | 'openApp' | 'saveFile' | 'navigation' | 'scroll';
  payload?: Record<string, unknown>;
};

export function courseUrl(documentUrl: string): string {
  const url = new URL(documentUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('The Learn course URL is invalid.');
  }
  url.searchParams.set('embed', 'native');
  return url.href;
}

/** Only real course routes under the configured base can stay in the WebView. */
export function isCourseUrl(candidate: string, entry: string): boolean {
  try {
    const url = new URL(candidate);
    const expected = new URL(entry);
    if (url.origin !== expected.origin || url.username || url.password) return false;
    const base = expected.pathname.replace(/\/$/, '');
    if (url.pathname !== base && !url.pathname.startsWith(base + '/')) return false;
    const route = decodeURIComponent(url.pathname.slice(base.length)).replace(/\/$/, '');
    if (route === '' || /^\/(onboard|placement(?:\/age)?|paths|practice|me)$/.test(route)) return true;
    return /^\/(path|lesson|bite)\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(route);
  } catch {
    return false;
  }
}

/** Android's WebMessageListener reports sourceOrigin; iOS/older Android report a URL. */
export function isTrustedMessageUrl(source: string, entry: string, currentDocument: string): boolean {
  if (!isCourseUrl(currentDocument, entry)) return false;
  if (isCourseUrl(source, entry)) return true;
  try {
    const reported = new URL(source);
    const expected = new URL(entry);
    return reported.origin === expected.origin && reported.pathname === '/' &&
      !reported.search && !reported.hash && !reported.username && !reported.password;
  } catch {
    return false;
  }
}

export function externalUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    return ['https:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password
      ? url.href : null;
  } catch {
    return null;
  }
}

export function parseLearnRequest(data: string): LearnRequest | null {
  if (typeof data !== 'string' || data.length > MAX_MESSAGE_LENGTH) return null;
  try {
    const request = JSON.parse(data);
    if (!request || request.source !== 'jinnie-learn' || typeof request.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(request.id) ||
      !['ready', 'saveState', 'openApp', 'saveFile', 'navigation', 'scroll'].includes(request.type)) return null;
    if (request.payload !== undefined && (!request.payload || typeof request.payload !== 'object' ||
      Array.isArray(request.payload))) return null;
    return request;
  } catch {
    return null;
  }
}

export function validateState(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_STATE_BYTES) throw new Error('Invalid learning progress.');
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid learning progress.');
  return value;
}

export function validateFile(payload: Record<string, unknown> = {}) {
  const {name, mime, base64} = payload;
  if (typeof name !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,149}$/.test(name) ||
    typeof base64 !== 'string' || base64.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64) ||
    !((mime === 'application/json' && name.endsWith('.json')) ||
      (mime === 'image/svg+xml' && name.endsWith('.svg')))) {
    throw new Error('The export must be a Learn backup or certificate, up to 4 MB.');
  }
  return {name, mime: mime as string, base64};
}

export function responseScript(id: string, ok: boolean, value?: unknown, error?: string): string {
  // JSON is data, never interpolated as executable message text.
  const detail = JSON.stringify({id, ok, value, error}).replace(/</g, '\\u003c');
  return `window.dispatchEvent(new CustomEvent('jinnie-learn-response',{detail:${detail}}));true;`;
}
