import { SOLANA_NETWORK_ID } from "config/chains";
import { GmxApiSdk } from "sdk/clients/v2";
import { getApiUrl } from "sdk/configs/api";

import { getGmsolApiUrlOverride } from "./getGmsolApiUrl";

const sdkCache = new Map<string, GmxApiSdk>();

export function getGmsolApiCacheKey() {
  return getGmsolApiUrlOverride() ?? getApiUrl(SOLANA_NETWORK_ID);
}

export function getGmsolApiSdk(cacheKey = getGmsolApiCacheKey()): GmxApiSdk {
  let sdk = sdkCache.get(cacheKey);

  if (!sdk) {
    sdk = new GmxApiSdk({
      chainId: SOLANA_NETWORK_ID,
      apiUrl: cacheKey === getApiUrl(SOLANA_NETWORK_ID) ? undefined : cacheKey,
    });
    sdkCache.set(cacheKey, sdk);
  }

  return sdk;
}
