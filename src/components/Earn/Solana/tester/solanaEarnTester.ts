// Tester for the Solana Earn design review: sample states, shown only outside gmx.io. Never merged.
import { useMemo, useSyncExternalStore } from "react";

import { isDevelopment } from "config/env";

import type { SolanaEarnData } from "../solanaEarnTypes";
import { getSolanaEarnTesterData, type SolanaEarnTesterScenario } from "./solanaEarnTesterFixtures";

export type SolanaEarnTesterPosition = { x: number; y: number };

type SolanaEarnTesterStore = {
  scenario: SolanaEarnTesterScenario;
  isCollapsed: boolean;
  // Top-left corner in viewport px after the user drags the Tester; undefined = default spot.
  position?: SolanaEarnTesterPosition;
};

const STORAGE_KEY = "solana-earn-tester-state-v1";
const DEFAULT_STORE: SolanaEarnTesterStore = { scenario: "typical", isCollapsed: false };

function readStored(): SolanaEarnTesterStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    // Storage can be blocked; fall back to defaults.
  }
  return DEFAULT_STORE;
}

let store: SolanaEarnTesterStore | undefined;
const listeners = new Set<() => void>();

function getStore(): SolanaEarnTesterStore {
  if (!store) store = readStored();
  return store;
}

export function setSolanaEarnTester(patch: Partial<SolanaEarnTesterStore>) {
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

export function useSolanaEarnTester(): SolanaEarnTesterStore {
  return useSyncExternalStore(subscribe, getStore, getStore);
}

// Fake page data for the picked state; undefined in "Live" (and outside dev) so the page uses its own data.
export function useSolanaEarnTesterData(): SolanaEarnData | undefined {
  const { scenario } = useSolanaEarnTester();
  return useMemo(() => (isDevelopment() ? getSolanaEarnTesterData(scenario) : undefined), [scenario]);
}
