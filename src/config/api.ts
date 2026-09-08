import { getIsFlagEnabled } from "config/ab";
import { getApiUrl, getStatsApiUrl, isApiSupported } from "sdk/configs/api";
import type { ApiEnvironment } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

import { isDevelopment } from "./env";
import { STATS_API_URL_KEY } from "./localStorage";

function getIsTestApiEnabled() {
  return getIsFlagEnabled("useTestApi");
}

function getUiApiEnvironment(): ApiEnvironment {
  return getIsTestApiEnabled() ? "test" : "production";
}

export function getUiApiOverrideUrl(chainId: ContractsChainId) {
  if (!getIsTestApiEnabled()) {
    return undefined;
  }

  return getApiUrl(chainId, "test");
}

export function getUiApiUrl(chainId: ContractsChainId) {
  return getApiUrl(chainId, getUiApiEnvironment());
}

export function getUiApiCacheKey(chainId: ContractsChainId) {
  const apiEnvironment = getUiApiUrl(chainId) ?? "unsupported";

  return [chainId, apiEnvironment].join(":");
}

export function isUiApiSupported(chainId: ContractsChainId) {
  return isApiSupported(chainId, getUiApiEnvironment());
}

export function getUiStatsApiUrl() {
  if (isDevelopment()) {
    const url = localStorage.getItem(STATS_API_URL_KEY);
    if (url) {
      return url;
    }
  }

  const url = getStatsApiUrl(getUiApiEnvironment());

  // the test stand is the only deployment serving stats, so previews and local builds fall back to it
  return url ?? (isDevelopment() ? getStatsApiUrl("test") : undefined);
}
