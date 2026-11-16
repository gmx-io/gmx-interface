import { getIsFlagEnabled } from "config/ab";
import { getApiUrl, getStatsApiUrl, isApiSupported } from "sdk/configs/api";
import type { ApiEnvironment } from "sdk/configs/api";
import { isSolanaNetwork } from "sdk/configs/chains";
import type { NetworkId } from "sdk/configs/chains";

import { isDevelopment } from "./env";
import { STATS_API_URL_KEY } from "./localStorage";

function getIsTestApiEnabled() {
  return getIsFlagEnabled("useTestApi");
}

function getUiApiEnvironment(): ApiEnvironment {
  return getIsTestApiEnabled() ? "test" : "production";
}

// Solana has no test API host, so the EVM test API flag must neither reroute nor disable it
function getUiNetworkApiEnvironment(networkId: NetworkId): ApiEnvironment {
  return isSolanaNetwork(networkId) ? "production" : getUiApiEnvironment();
}

export function getUiApiOverrideUrl(networkId: NetworkId) {
  if (getUiNetworkApiEnvironment(networkId) === "production") {
    return undefined;
  }

  return getApiUrl(networkId, "test");
}

export function getUiApiUrl(networkId: NetworkId) {
  return getApiUrl(networkId, getUiNetworkApiEnvironment(networkId));
}

export function getUiApiCacheKey(networkId: NetworkId) {
  const apiEnvironment = getUiApiUrl(networkId) ?? "unsupported";

  return [networkId, apiEnvironment].join(":");
}

export function isUiApiSupported(networkId: NetworkId) {
  return isApiSupported(networkId, getUiNetworkApiEnvironment(networkId));
}

export function getUiStatsApiUrl() {
  if (isDevelopment()) {
    const url = localStorage.getItem(STATS_API_URL_KEY);
    if (url) {
      return url;
    }
  }

  return getStatsApiUrl(getUiApiEnvironment());
}
