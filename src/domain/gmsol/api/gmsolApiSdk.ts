import { SOLANA_NETWORK_ID, type SolanaNetworkId } from "config/chains";
import { GmxApiSdk } from "sdk/clients/v2";
import { getApiUrl } from "sdk/configs/api";

import { createGmsolFixtureHttp, GMSOL_FIXTURE_HTTP_URL } from "./createGmsolFixtureHttp";
import { getGmsolApiUrlOverride, getIsGmsolApiFixturesEnabled } from "./getGmsolApiUrl";

const sdkCache = new Map<string, GmxApiSdk<SolanaNetworkId>>();

export function getGmsolApiCacheKey() {
  return getIsGmsolApiFixturesEnabled()
    ? GMSOL_FIXTURE_HTTP_URL
    : getGmsolApiUrlOverride() ?? getApiUrl(SOLANA_NETWORK_ID);
}

export function getGmsolApiSdk(cacheKey = getGmsolApiCacheKey()): GmxApiSdk<SolanaNetworkId> {
  let sdk = sdkCache.get(cacheKey);

  if (!sdk) {
    sdk = new GmxApiSdk({
      networkId: SOLANA_NETWORK_ID,
      ...(cacheKey === GMSOL_FIXTURE_HTTP_URL
        ? { api: createGmsolFixtureHttp() }
        : { apiUrl: cacheKey === getApiUrl(SOLANA_NETWORK_ID) ? undefined : cacheKey }),
    });
    sdkCache.set(cacheKey, sdk);
  }

  return sdk;
}
