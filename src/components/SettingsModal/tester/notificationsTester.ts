// Local-only Tester for the Notifications tab. Never commit or push (guarded by info/exclude + pre-push).
import { useCallback, useSyncExternalStore } from "react";

import type { NotificationsState } from "../NotificationsSettings";

export type NotificationsTesterPosition = { x: number; y: number };

type NotificationsTesterStore = {
  state: NotificationsState;
  isCollapsed: boolean;
  // Top-left corner in viewport px after the user drags the Tester; undefined = default spot.
  position?: NotificationsTesterPosition;
};

const STORAGE_KEY = "notifications-tester-state-v1";

function readStored(): NotificationsTesterStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { state: "on", isCollapsed: true, ...JSON.parse(raw) };
  } catch {
    // Storage can be blocked; fall back to defaults.
  }
  return { state: "on", isCollapsed: true };
}

let store: NotificationsTesterStore | undefined;
const listeners = new Set<() => void>();

function getStore(): NotificationsTesterStore {
  if (!store) store = readStored();
  return store;
}

export function setNotificationsTester(patch: Partial<NotificationsTesterStore>) {
  store = { ...getStore(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors; the Tester still works for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationsTester(): NotificationsTesterStore {
  return useSyncExternalStore(subscribe, getStore, getStore);
}

// Drop-in for useState in NotificationsSettings, so the tab and the Tester share one state.
export function useNotificationsTesterState(): [NotificationsState, (state: NotificationsState) => void] {
  const { state } = useNotificationsTester();
  const setState = useCallback((next: NotificationsState) => setNotificationsTester({ state: next }), []);
  return [state, setState];
}
