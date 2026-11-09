// Tester for the GT Points design review: sample states, shown only outside gmx.io. Never merged.
import { useMemo, useSyncExternalStore } from "react";

import { isDevelopment } from "config/env";

import type { GtPointsData } from "../gtPointsTypes";
import { getGtPointsTesterData, type GtPointsTesterScenario } from "./gtPointsTesterFixtures";

export type GtPointsTesterPosition = { x: number; y: number };

type GtPointsTesterStore = {
  scenario: GtPointsTesterScenario;
  isCollapsed: boolean;
  // Top-left corner in viewport px after the user drags the Tester; undefined = default spot.
  position?: GtPointsTesterPosition;
};

export const GT_POINTS_TESTER_STORAGE_KEY = "gt-points-tester-state-v1";
const DEFAULT_STORE: GtPointsTesterStore = { scenario: "typical", isCollapsed: false };

function readStored(): GtPointsTesterStore {
  try {
    const raw = window.localStorage.getItem(GT_POINTS_TESTER_STORAGE_KEY);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    // Storage can be blocked; fall back to defaults.
  }
  return DEFAULT_STORE;
}

let store: GtPointsTesterStore | undefined;
const listeners = new Set<() => void>();

function getStore(): GtPointsTesterStore {
  if (!store) store = readStored();
  return store;
}

export function setGtPointsTester(patch: Partial<GtPointsTesterStore>) {
  store = { ...getStore(), ...patch };
  try {
    window.localStorage.setItem(GT_POINTS_TESTER_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors; the Tester still works for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGtPointsTester(): GtPointsTesterStore {
  return useSyncExternalStore(subscribe, getStore, getStore);
}

// Fake page data for the picked state; undefined in "Live" (and outside dev) so the page uses its own data.
export function useGtPointsTesterData(): GtPointsData | undefined {
  const { scenario } = useGtPointsTester();
  return useMemo(() => (isDevelopment() ? getGtPointsTesterData(scenario) : undefined), [scenario]);
}
