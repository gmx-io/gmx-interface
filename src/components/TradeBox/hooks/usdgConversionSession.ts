import { useSyncExternalStore } from "react";

import type { ConfirmedUsdgOrder } from "domain/synthetics/usdgPools/orderAutoSubmit";

export type UsdgConversionStep = "idle" | "submitting" | "converting";

export type PendingUsdgConversion = {
  knownOrderStatusKeys: Set<string>;
  marketAddress: string | undefined;
  tokenInAddress: string;
  tokenOutAddress: string;
  tokenOutDecimals: number;
  minAmountOut: bigint;
  swapPath: string[];
  confirmedOrder: ConfirmedUsdgOrder;
  isGmxAccount: boolean;
};

export type UsdgConversionSession = {
  owner: { account: string | undefined; chainId: number } | undefined;
  step: UsdgConversionStep;
  convertingSince: number | undefined;
  relayTaskId: string | undefined;
  pending: PendingUsdgConversion | undefined;
  // bumped on every reset, so a receipt that lands after a reset is ignored
  generation: number;
  lastConversion: { marketAddress: string | undefined; amountOut: bigint } | undefined;
  orderAutoSubmitArm:
    | { confirmedOrder: ConfirmedUsdgOrder; armedAt: number; requestedApprovalTokens: string[] }
    | undefined;
};

export const IDLE_USDG_CONVERSION_STEP = {
  step: "idle",
  convertingSince: undefined,
  relayTaskId: undefined,
  pending: undefined,
} satisfies Partial<UsdgConversionSession>;

/**
 * The convert step outlives the trade box: a layout change across the tablet breakpoint remounts it while the
 * swap is in flight, and the order step has to carry on afterwards.
 */
let session: UsdgConversionSession = {
  ...IDLE_USDG_CONVERSION_STEP,
  owner: undefined,
  generation: 0,
  lastConversion: undefined,
  orderAutoSubmitArm: undefined,
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getUsdgConversionSession() {
  return session;
}

export function updateUsdgConversionSession(update: (current: UsdgConversionSession) => UsdgConversionSession) {
  session = update(session);
  listeners.forEach((listener) => listener());
}

export function useUsdgConversionSession() {
  return useSyncExternalStore(subscribe, getUsdgConversionSession);
}
