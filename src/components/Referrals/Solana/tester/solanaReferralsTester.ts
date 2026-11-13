// Tester for the Solana Referrals design review: sample states, shown only outside gmx.io. Never merged.
import { useMemo, useSyncExternalStore } from "react";

import { isDevelopment } from "config/env";

import type { SolanaReferralsData } from "../solanaReferralsTypes";
import { getSolanaReferralsTesterData, type SolanaReferralsTesterScenario } from "./solanaReferralsTesterFixtures";

export type SolanaReferralsTesterPosition = { x: number; y: number };

type SolanaReferralsTesterStore = {
  scenario: SolanaReferralsTesterScenario;
  isCollapsed: boolean;
  // Top-left corner in viewport px after the user drags the Tester; undefined = default spot.
  position?: SolanaReferralsTesterPosition;
};

export const SOLANA_REFERRALS_TESTER_STORAGE_KEY = "solana-referrals-tester-state-v1";
const DEFAULT_STORE: SolanaReferralsTesterStore = { scenario: "trader", isCollapsed: false };

function readStored(): SolanaReferralsTesterStore {
  try {
    const raw = window.localStorage.getItem(SOLANA_REFERRALS_TESTER_STORAGE_KEY);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {
    // Storage can be blocked; fall back to defaults.
  }
  return DEFAULT_STORE;
}

let store: SolanaReferralsTesterStore | undefined;
const listeners = new Set<() => void>();

function getStore(): SolanaReferralsTesterStore {
  if (!store) store = readStored();
  return store;
}

export function setSolanaReferralsTester(patch: Partial<SolanaReferralsTesterStore>) {
  store = { ...getStore(), ...patch };
  try {
    window.localStorage.setItem(SOLANA_REFERRALS_TESTER_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors; the Tester still works for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSolanaReferralsTester(): SolanaReferralsTesterStore {
  return useSyncExternalStore(subscribe, getStore, getStore);
}

// Fake page data for the picked state; undefined in "Live" (and outside dev) so the page uses its own data.
export function useSolanaReferralsTesterData(): SolanaReferralsData | undefined {
  const { scenario } = useSolanaReferralsTester();
  return useMemo(() => (isDevelopment() ? getSolanaReferralsTesterData(scenario) : undefined), [scenario]);
}
