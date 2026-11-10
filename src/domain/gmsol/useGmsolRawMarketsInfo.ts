import { useMemo, useRef } from "react";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import {
  getIsValuesSnapshotFrozen,
  hasIncompleteMarketValues,
  hasStaleMarketValues,
  trackValuesSnapshot,
  type MarketValuesSnapshot,
} from "domain/synthetics/markets/useMarketsInfoRequest/useApiMarketsInfoRequest";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";

import { getGmsolApiCacheKey, getGmsolApiSdk } from "./api/gmsolApiSdk";

export type GmsolRawMarketsInfoResult = {
  rawMarketsInfoData: RawMarketsInfoData | undefined;
  isLoading: boolean;
  // Solana has no RPC fallback: an error, stale or incomplete response makes the markets unavailable.
  isUnavailable: boolean;
  error: Error | undefined;
};

export function getGmsolMarketsConfigKey(apiCacheKey: string) {
  return ["gmsolMarketsConfig", SOLANA_NETWORK_ID, apiCacheKey] as const;
}

export function getGmsolMarketsValuesKey(apiCacheKey: string) {
  return ["gmsolMarketsValues", SOLANA_NETWORK_ID, apiCacheKey] as const;
}

export function useGmsolRawMarketsInfo({ enabled }: { enabled: boolean }): GmsolRawMarketsInfoResult {
  const apiCacheKey = getGmsolApiCacheKey();

  const config = useSWRWithFreshness<RawMarketConfig[]>(
    enabled ? getGmsolMarketsConfigKey(apiCacheKey) : null,
    ([, , keyApiCacheKey]: ReturnType<typeof getGmsolMarketsConfigKey>) =>
      getGmsolApiSdk(keyApiCacheKey).fetchMarketsConfig(),
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  const values = useSWRWithFreshness<RawMarketValues[]>(
    enabled ? getGmsolMarketsValuesKey(apiCacheKey) : null,
    ([, , keyApiCacheKey]: ReturnType<typeof getGmsolMarketsValuesKey>) =>
      getGmsolApiSdk(keyApiCacheKey).fetchMarketsValues(),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  const configData = config.data;
  const valuesData = values.data;
  const configError = config.error;
  const valuesError = values.error;
  const error = valuesError ?? configError;

  const rawMarketsInfoData = useMemo(() => {
    if (!configData || !valuesData) {
      return undefined;
    }

    return mergeMarketsConfigValues(configData, valuesData);
  }, [configData, valuesData]);

  const disabledMarketAddresses = useMemo(
    () => new Set((configData ?? []).filter((market) => market.isDisabled).map((market) => market.marketTokenAddress)),
    [configData]
  );

  // The snapshot helpers compare by chain id only; Solana's markets are tracked under one constant id.
  const valuesSnapshotRef = useRef<MarketValuesSnapshot | undefined>(undefined);
  valuesSnapshotRef.current = trackValuesSnapshot(
    valuesSnapshotRef.current,
    ARBITRUM,
    valuesData,
    values.freshness.asOf
  );

  const isStale =
    hasStaleMarketValues(configData, valuesData, disabledMarketAddresses) ||
    getIsValuesSnapshotFrozen(valuesSnapshotRef.current, values.freshness.asOf);
  const isIncomplete = hasIncompleteMarketValues(configData, valuesData, disabledMarketAddresses);
  const isExpired =
    isSnapshotPastGrace(config.freshness.asOf, CONFIG_UPDATE_INTERVAL) ||
    isSnapshotPastGrace(values.freshness.asOf, FREQUENT_UPDATE_INTERVAL);

  if (!enabled) {
    return { rawMarketsInfoData: undefined, isLoading: false, isUnavailable: false, error: undefined };
  }

  const isUnavailable = Boolean(error) || isStale || isIncomplete || isExpired;
  // A failed read keeps the last good snapshot until the same grace window EVM uses, then drops it.
  const keepSnapshot = Boolean(rawMarketsInfoData) && !isStale && !isIncomplete && !isExpired;

  return {
    rawMarketsInfoData: keepSnapshot ? rawMarketsInfoData : undefined,
    isLoading: !error && !rawMarketsInfoData,
    isUnavailable,
    error,
  };
}
