import { getIsFlagEnabled } from "config/ab";
import type { ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";

import { getApiRolloutBucket } from "./apiRolloutBucket";
import { useUiFlagsRequest, type UiFlags } from "./useUiFlagsRequest";

export const API_UI_FLAGS = {
  markets: "apiMarkets",
  positions: "apiPositions",
  orders: "apiOrders",
  wsPrices: "wsPrices",
  wsCandles: "wsCandles",
} as const;

export type ApiUiFlagName = (typeof API_UI_FLAGS)[keyof typeof API_UI_FLAGS];

const ROLLOUT_PERCENTAGES = {
  api: [30, 50, 100],
  ws: [1, 10, 50, 100],
} as const;

type Rollout = keyof typeof ROLLOUT_PERCENTAGES;

const WS_UI_FLAGS: readonly ApiUiFlagName[] = [API_UI_FLAGS.wsPrices, API_UI_FLAGS.wsCandles];

function getMaxActiveRolloutPercent(uiFlags: UiFlags | undefined, rollout: Rollout): number {
  if (!uiFlags) return 0;

  let max = 0;
  for (const pct of ROLLOUT_PERCENTAGES[rollout]) {
    if (uiFlags[`${rollout}${pct}`]?.enabled === true && pct > max) {
      max = pct;
    }
  }
  return max;
}

function isInRolloutBucket(percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return getApiRolloutBucket() < percent;
}

export function useIsApiSdkEnabled(uiFlagName: ApiUiFlagName, chainId?: ContractsChainId): boolean {
  const { uiFlags } = useUiFlagsRequest(chainId);
  const rollout: Rollout = WS_UI_FLAGS.includes(uiFlagName) ? "ws" : "api";

  if (isDevelopment()) {
    return getIsFlagEnabled(rollout === "ws" ? "abWebsocket" : "abSdk3");
  }

  if (uiFlags?.[uiFlagName]?.enabled === true) {
    const rolloutPercent = getMaxActiveRolloutPercent(uiFlags, rollout);
    return isInRolloutBucket(rolloutPercent);
  }

  return false;
}
