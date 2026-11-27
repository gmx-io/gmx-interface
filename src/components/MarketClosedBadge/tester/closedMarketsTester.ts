// Tester for the DES-103 design review (copied from DES-96): close markets on demand and show a trader's positions. Local only, never merged.
import { useMemo, useSyncExternalStore } from "react";
import { isAddress } from "viem";

import type { ClosedMarkets, MarketsInfoData } from "domain/synthetics/markets/types";

const KEY = "gmx-closed-markets-tester-des103-v1";

export type ClosedMarketsTesterState = {
  isOn: boolean;
  /** Index token symbols whose markets show as closed, e.g. GOLD. */
  closedSymbols: string[];
  /** Whose positions and orders the trade page shows: a sample trader found live, or the connected wallet. */
  viewMode: "sample" | "wallet";
  /** The sample trader found live from public market data (never written into the code). */
  viewAs: string;
  isPanelOpen: boolean;
  /** Where the Tester pill was dragged to (top-left, viewport px); null = default corner. */
  pillPos: { x: number; y: number } | null;
};

const DEFAULT: ClosedMarketsTesterState = {
  isOn: true,
  closedSymbols: [],
  viewMode: "sample",
  viewAs: "",
  isPanelOpen: true,
  pillPos: null,
};

export const isClosedMarketsTesterAllowed =
  typeof window !== "undefined" && !/(^|\.)gmx\.io$/.test(window.location.hostname);

function read(): ClosedMarketsTesterState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Link preset: ?closed=GOLD,SILVER,WTIOIL opens the trade page with those markets closed. */
function readLinkPreset(base: ClosedMarketsTesterState): ClosedMarketsTesterState {
  const closed = new URLSearchParams(window.location.search).get("closed");
  if (closed === null) return base;

  const next: ClosedMarketsTesterState = {
    ...base,
    isOn: true,
    viewMode: "sample",
    closedSymbols: closed.split(",").filter(Boolean),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

let state: ClosedMarketsTesterState = typeof window === "undefined" ? DEFAULT : readLinkPreset(read());
const listeners = new Set<() => void>();

export function setClosedMarketsTester(patch: Partial<ClosedMarketsTesterState>) {
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

export function useClosedMarketsTester() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

export function useClosedMarketsTesterAccount(walletAccount: string | undefined, isTradePage: boolean) {
  const tester = useClosedMarketsTester();
  if (
    !isClosedMarketsTesterAllowed ||
    !isTradePage ||
    !tester.isOn ||
    tester.viewMode !== "sample" ||
    !isAddress(tester.viewAs)
  ) {
    return walletAccount;
  }
  return tester.viewAs;
}

export function useClosedMarketsWithTester(
  realClosedMarkets: ClosedMarkets | undefined,
  marketsInfoData: MarketsInfoData | undefined
): ClosedMarkets | undefined {
  const tester = useClosedMarketsTester();

  return useMemo(() => {
    if (!isClosedMarketsTesterAllowed || !tester.isOn || !marketsInfoData) {
      return realClosedMarkets;
    }

    const closedMarkets: ClosedMarkets = {};
    for (const marketInfo of Object.values(marketsInfoData)) {
      if (tester.closedSymbols.includes(marketInfo.indexToken.symbol)) {
        closedMarkets[marketInfo.marketTokenAddress] = true;
      }
    }
    return closedMarkets;
  }, [marketsInfoData, realClosedMarkets, tester.closedSymbols, tester.isOn]);
}
