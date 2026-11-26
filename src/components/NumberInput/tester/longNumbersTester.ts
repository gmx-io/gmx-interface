// Tester for the long numbers design review: shows a public sample trader's positions so Edit margin can be opened
// without a wallet. Local only, never merged.
import { useSyncExternalStore } from "react";
import { isAddress } from "viem";

const KEY = "gmx-long-numbers-tester-v1";

export type LongNumbersTesterState = {
  isOn: boolean;
  /** Whose positions the trade page shows: a sample trader found live, or the connected wallet. */
  viewMode: "sample" | "wallet";
  /** The sample trader found live from public market data (never written into the code). */
  viewAs: string;
  isPanelOpen: boolean;
  /** Where the Tester pill was dragged to (top-left, viewport px); null = default corner. */
  pillPos: { x: number; y: number } | null;
};

// on phones the panel starts closed (just the pill), so it doesn't cover the trade box
const isWideScreen = typeof window !== "undefined" && window.innerWidth >= 1024;

const DEFAULT: LongNumbersTesterState = {
  isOn: true,
  viewMode: "sample",
  viewAs: "",
  isPanelOpen: isWideScreen,
  pillPos: null,
};

export const isLongNumbersTesterAllowed =
  typeof window !== "undefined" && !/(^|\.)gmx\.io$/.test(window.location.hostname);

function read(): LongNumbersTesterState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Link preset: ?longNumbersTester=1 opens the trade page with a sample trader's positions. */
function readLinkPreset(base: LongNumbersTesterState): LongNumbersTesterState {
  if (new URLSearchParams(window.location.search).get("longNumbersTester") === null) return base;

  const next: LongNumbersTesterState = { ...base, isOn: true, viewMode: "sample", isPanelOpen: isWideScreen };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

let state: LongNumbersTesterState = typeof window === "undefined" ? DEFAULT : readLinkPreset(read());
const listeners = new Set<() => void>();

export function setLongNumbersTester(patch: Partial<LongNumbersTesterState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLongNumbersTester() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

export function useLongNumbersTesterAccount(walletAccount: string | undefined, isTradePage: boolean) {
  const tester = useLongNumbersTester();
  if (
    !isLongNumbersTesterAllowed ||
    !isTradePage ||
    !tester.isOn ||
    tester.viewMode !== "sample" ||
    !isAddress(tester.viewAs)
  ) {
    return walletAccount;
  }
  return tester.viewAs;
}
