import {useSyncExternalStore} from 'react';
import type {MiniAppManifest} from './manifest';

/*
 * The current app list, as the host loaded it from `apps.json`. It lives in
 * the singleton so Settings can offer the choice of what to show, without
 * the host having to hand the list through the bridge.
 */

let apps: MiniAppManifest[] = [];
const listeners = new Set<() => void>();

export function setApps(next: MiniAppManifest[]): void {
  apps = next;
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useApps(): MiniAppManifest[] {
  return useSyncExternalStore(subscribe, () => apps);
}

export function getApp(id: string): MiniAppManifest | undefined {
  return apps.find(app => app.id === id);
}
