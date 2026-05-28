import { getIsFlagEnabled } from "config/ab";
import { getApiUrl, isApiSupported } from "sdk/configs/api";
import type { ApiEnvironment } from "sdk/configs/api";
import type { ContractsChainId } from "sdk/configs/chains";

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
