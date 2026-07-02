import { getIsFlagEnabled } from "config/ab";
import { isDevelopment } from "config/env";

import { getApiRolloutBucket } from "./apiRolloutBucket";
import { useUiFlagsRequest, type UiFlags } from "./useUiFlagsRequest";

export const API_UI_FLAGS = {
  markets: "apiMarkets",
  positions: "apiPositions",
  orders: "apiOrders",
} as const;

export type ApiUiFlagName = (typeof API_UI_FLAGS)[keyof typeof API_UI_FLAGS];

const API_ROLLOUT_PERCENTAGES = [30, 50, 100] as const;

function getMaxActiveRolloutPercent(uiFlags: UiFlags | undefined): number {
  if (!uiFlags) return 0;

  let max = 0;
  for (const pct of API_ROLLOUT_PERCENTAGES) {
    if (uiFlags[`api${pct}`] === true && pct > max) {
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

export function useIsApiSdkEnabled(uiFlagName: ApiUiFlagName): boolean {
  const { uiFlags } = useUiFlagsRequest();

  if (isDevelopment()) {
    return getIsFlagEnabled("abSdk3");
  }

  if (uiFlags?.[uiFlagName] === true) {
    const rolloutPercent = getMaxActiveRolloutPercent(uiFlags);
    return isInRolloutBucket(rolloutPercent);
  }

  return false;
}
