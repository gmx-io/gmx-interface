import { ARBITRUM } from "config/chains";
import { GmxApiSdk } from "sdk/clients/v2";
import { HttpClient } from "sdk/utils/http/http";
import type { IHttp } from "sdk/utils/http/types";

import { createGmsolFixtureHttp, GMSOL_FIXTURE_HTTP_URL } from "./createGmsolFixtureHttp";
import { getGmsolApiUrl, getIsGmsolApiFixturesEnabled } from "./getGmsolApiUrl";

const sdkCache = new Map<string, GmxApiSdk>();

export function getGmsolApiHttp(): IHttp {
  return getIsGmsolApiFixturesEnabled() ? createGmsolFixtureHttp() : new HttpClient(getGmsolApiUrl());
}

export function getGmsolApiCacheKey() {
  return getIsGmsolApiFixturesEnabled() ? GMSOL_FIXTURE_HTTP_URL : getGmsolApiUrl();
}

// GmxApiSdk is typed by EVM chain id; on Solana the app's chainId stays Arbitrum, and passing `api`
// keeps the SDK from resolving an EVM host, so API_URLS stay EVM-only.
export function getGmsolApiSdk(): GmxApiSdk {
  const cacheKey = getGmsolApiCacheKey();
  let sdk = sdkCache.get(cacheKey);

  if (!sdk) {
    sdk = new GmxApiSdk({ chainId: ARBITRUM, api: getGmsolApiHttp() });
    sdkCache.set(cacheKey, sdk);
  }

  return sdk;
}
