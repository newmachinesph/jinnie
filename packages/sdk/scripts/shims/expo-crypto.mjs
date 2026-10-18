import {webcrypto} from 'node:crypto';
export function getRandomValues(array) {
  return webcrypto.getRandomValues(array);
}
