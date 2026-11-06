import { SOLANA_NETWORK_ID, type SolanaNetworkId } from "config/chains";
import { GmxApiSdk } from "sdk/clients/v2";
import { getApiUrl } from "sdk/configs/api";

import { getGmsolApiUrlOverride } from "./getGmsolApiUrl";

const sdkCache = new Map<string, GmxApiSdk<SolanaNetworkId>>();

export function getGmsolApiCacheKey() {
  return getGmsolApiUrlOverride() ?? getApiUrl(SOLANA_NETWORK_ID);
}

export function getGmsolApiSdk(cacheKey = getGmsolApiCacheKey()): GmxApiSdk<SolanaNetworkId> {
  let sdk = sdkCache.get(cacheKey);

  if (!sdk) {
    sdk = new GmxApiSdk({
      networkId: SOLANA_NETWORK_ID,
      apiUrl: cacheKey === getApiUrl(SOLANA_NETWORK_ID) ? undefined : cacheKey,
    });
    sdkCache.set(cacheKey, sdk);
  }

  return sdk;
}
