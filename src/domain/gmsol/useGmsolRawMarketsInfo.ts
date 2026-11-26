import { useCallback, useMemo, useRef } from "react";

import { getUiApiCacheKey } from "config/api";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import {
  getIsValuesSnapshotFrozen,
  hasIncompleteMarketValues,
  hasStaleMarketValues,
  trackValuesSnapshot,
  type MarketValuesSnapshot,
} from "domain/synthetics/markets/useMarketsInfoRequest/useApiMarketsInfoRequest";
import { EMPTY_ARRAY } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { API_STALE_MS, isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";

import type { GmsolMarketsUnavailableReason } from "./markets/gmsolMarketsUnavailable";

export type GmsolRawMarketsInfoResult = {
  rawMarketsInfoData: RawMarketsInfoData | undefined;
  isLoading: boolean;
  // Solana has no RPC fallback: an error, a stale snapshot or missing fields make every market unavailable.
  unavailableReason: Exclude<GmsolMarketsUnavailableReason, "coverage"> | undefined;
  missingMarketAddresses: string[];
  error: Error | undefined;
  refetch: () => Promise<unknown>;
};

// Values can omit a market the cached config still lists; only that market is unavailable unless values cover none.
export function getGmsolMarketValuesGaps(
  configData: RawMarketConfig[] | undefined,
  valuesData: RawMarketValues[] | undefined
): { isStale: boolean; missingMarketAddresses: string[] } {
  if (!configData || !valuesData) {
    return { isStale: false, missingMarketAddresses: EMPTY_ARRAY };
  }

  const valuesAddresses = new Set(valuesData.map((value) => value.marketTokenAddress));
  const enabledMarkets = configData.filter((market) => !market.isDisabled);
  const coveredMarkets = enabledMarkets.filter((market) => valuesAddresses.has(market.marketTokenAddress));

  return {
    isStale:
      (enabledMarkets.length > 0 && coveredMarkets.length === 0) ||
      hasStaleMarketValues(coveredMarkets, valuesData, new Set()) ||
      hasIncompleteMarketValues(coveredMarkets, valuesData, new Set()),
    missingMarketAddresses: enabledMarkets
      .filter((market) => !valuesAddresses.has(market.marketTokenAddress))
      .map((market) => market.marketTokenAddress),
  };
}

export function getGmsolMarketsConfigKey(apiCacheKey: string) {
  return ["gmsolMarketsConfig", SOLANA_NETWORK_ID, apiCacheKey] as const;
}

export function getGmsolMarketsValuesKey(apiCacheKey: string) {
  return ["gmsolMarketsValues", SOLANA_NETWORK_ID, apiCacheKey] as const;
}

export function useGmsolRawMarketsInfo({ enabled }: { enabled: boolean }): GmsolRawMarketsInfoResult {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const apiCacheKey = getUiApiCacheKey(SOLANA_NETWORK_ID);

  const config = useSWRWithFreshness<RawMarketConfig[]>(
    enabled && sdk ? getGmsolMarketsConfigKey(apiCacheKey) : null,
    () => sdk!.fetchMarketsConfig(),
    { refreshInterval: CONFIG_UPDATE_INTERVAL, maxAgeMs: CONFIG_UPDATE_INTERVAL + API_STALE_MS }
  );

  const values = useSWRWithFreshness<RawMarketValues[]>(
    enabled && sdk ? getGmsolMarketsValuesKey(apiCacheKey) : null,
    () => sdk!.fetchMarketsValues(),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL, maxAgeMs: FREQUENT_UPDATE_INTERVAL + API_STALE_MS }
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

  const valuesGaps = useMemo(() => getGmsolMarketValuesGaps(configData, valuesData), [configData, valuesData]);

  // The snapshot helpers compare by chain id only; Solana's markets are tracked under one constant id.
  const valuesSnapshotRef = useRef<MarketValuesSnapshot | undefined>(undefined);
  valuesSnapshotRef.current = trackValuesSnapshot(
    valuesSnapshotRef.current,
    ARBITRUM,
    valuesData,
    values.freshness.asOf
  );

  const isStale = valuesGaps.isStale || getIsValuesSnapshotFrozen(valuesSnapshotRef.current, values.freshness.asOf);
  const isExpired =
    isSnapshotPastGrace(config.freshness.asOf, CONFIG_UPDATE_INTERVAL) ||
    isSnapshotPastGrace(values.freshness.asOf, FREQUENT_UPDATE_INTERVAL);

  const refetchConfig = config.refetch;
  const refetchValues = values.refetch;
  const refetch = useCallback(() => Promise.all([refetchConfig(), refetchValues()]), [refetchConfig, refetchValues]);

  if (!enabled) {
    return {
      rawMarketsInfoData: undefined,
      isLoading: false,
      unavailableReason: undefined,
      missingMarketAddresses: EMPTY_ARRAY,
      error: undefined,
      refetch,
    };
  }

  // A failed read keeps the last good snapshot until the same grace window EVM uses, then drops it.
  const keepSnapshot = Boolean(rawMarketsInfoData) && !isStale && !isExpired;

  return {
    rawMarketsInfoData: keepSnapshot ? rawMarketsInfoData : undefined,
    isLoading: !error && !rawMarketsInfoData,
    unavailableReason: !sdk || error ? "request" : isStale || isExpired ? "stale" : undefined,
    missingMarketAddresses: keepSnapshot ? valuesGaps.missingMarketAddresses : EMPTY_ARRAY,
    error,
    refetch,
  };
}
