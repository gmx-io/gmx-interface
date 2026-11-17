import { useMemo, useRef } from "react";

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
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { API_STALE_MS, isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";

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

  const isUnavailable = !sdk || Boolean(error) || isStale || isIncomplete || isExpired;
  // A failed read keeps the last good snapshot until the same grace window EVM uses, then drops it.
  const keepSnapshot = Boolean(rawMarketsInfoData) && !isStale && !isIncomplete && !isExpired;

  return {
    rawMarketsInfoData: keepSnapshot ? rawMarketsInfoData : undefined,
    isLoading: !error && !rawMarketsInfoData,
    isUnavailable,
    error,
  };
}
