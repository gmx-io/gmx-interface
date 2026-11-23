// Tester for the Stats page design review: data states, shown only outside gmx.io. Never merged.
// Opening the page with ?statsTester=1 turns the Tester on; the parameter is then removed from the address.
import { useSyncExternalStore } from "react";

import { isDevelopment } from "config/env";

import type { StatsDataState } from "../statsDataState";

export type StatsTesterPosition = { x: number; y: number };

type StatsTesterStore = {
  enabled: boolean;
  state: StatsDataState;
  isCollapsed: boolean;
  // Top-left corner in viewport px after the user drags the Tester; undefined = default spot.
  position?: StatsTesterPosition;
};

const PARAM = "statsTester";
export const STATS_TESTER_STORAGE_KEY = "stats-tester-state-v1";
const DEFAULT_STORE: StatsTesterStore = { enabled: false, state: "ready", isCollapsed: false };

function readStored(): StatsTesterStore {
  try {
    const raw = window.localStorage.getItem(STATS_TESTER_STORAGE_KEY);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    // Storage can be blocked; fall back to defaults.
  }
  return DEFAULT_STORE;
}

let store: StatsTesterStore | undefined;
const listeners = new Set<() => void>();

function getStore(): StatsTesterStore {
  if (!store) store = readStored();
  return store;
}

export function setStatsTester(patch: Partial<StatsTesterStore>) {
  store = { ...getStore(), ...patch };
  try {
    window.localStorage.setItem(STATS_TESTER_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors; the Tester still works for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStatsTester(): StatsTesterStore {
  return useSyncExternalStore(subscribe, getStore, getStore);
}

// The picked data state; undefined while the Tester is off (and always on gmx.io), so the page uses its own.
export function useStatsTesterState(): StatsDataState | undefined {
  const { enabled, state } = useStatsTester();
  return isDevelopment() && enabled ? state : undefined;
}

function bootstrapStatsTester() {
  if (!isDevelopment() || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  setStatsTester({ enabled: true, isCollapsed: false });
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

bootstrapStatsTester();
