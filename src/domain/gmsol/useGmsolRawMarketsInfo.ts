import { useMemo, useRef } from "react";
import useSWR from "swr";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import {
  getIsValuesSnapshotFrozen,
  hasIncompleteMarketValues,
  hasStaleMarketValues,
  trackValuesSnapshot,
  type MarketValuesSnapshot,
} from "domain/synthetics/markets/useMarketsInfoRequest/useApiMarketsInfoRequest";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
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

type ValuesResponse = { values: RawMarketValues[]; receivedAt: number };

export function useGmsolRawMarketsInfo({ enabled }: { enabled: boolean }): GmsolRawMarketsInfoResult {
  const apiCacheKey = getGmsolApiCacheKey();

  const { data: configData, error: configError } = useSWR<RawMarketConfig[], Error>(
    enabled ? getGmsolMarketsConfigKey(apiCacheKey) : null,
    () => getGmsolApiSdk().fetchMarketsConfig(),
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  const { data: valuesResponse, error: valuesError } = useSWR<ValuesResponse, Error>(
    enabled ? getGmsolMarketsValuesKey(apiCacheKey) : null,
    async () => ({ values: await getGmsolApiSdk().fetchMarketsValues(), receivedAt: Date.now() }),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  const valuesData = valuesResponse?.values;

  const rawMarketsInfoData = useMemo(() => {
    if (!configData || !valuesData) {
      return undefined;
    }

    return mergeMarketsConfigValues(configData, valuesData);
  }, [configData, valuesData]);

  const disabledMarketAddresses = useMemo(
    () => new Set((configData ?? []).filter((config) => config.isDisabled).map((config) => config.marketTokenAddress)),
    [configData]
  );

  // The snapshot helpers compare by chain id only; Solana's markets are tracked under one constant id.
  const valuesSnapshotRef = useRef<MarketValuesSnapshot | undefined>(undefined);
  valuesSnapshotRef.current = trackValuesSnapshot(
    valuesSnapshotRef.current,
    ARBITRUM,
    valuesData,
    valuesResponse?.receivedAt
  );

  const isStale =
    hasStaleMarketValues(configData, valuesData, disabledMarketAddresses) ||
    getIsValuesSnapshotFrozen(valuesSnapshotRef.current, valuesResponse?.receivedAt);
  const isIncomplete = hasIncompleteMarketValues(configData, valuesData, disabledMarketAddresses);
  const error = valuesError ?? configError;

  if (!enabled) {
    return { rawMarketsInfoData: undefined, isLoading: false, isUnavailable: false, error: undefined };
  }

  const isUnavailable = Boolean(error) || isStale || isIncomplete;

  return {
    rawMarketsInfoData: isUnavailable ? undefined : rawMarketsInfoData,
    isLoading: !error && !rawMarketsInfoData,
    isUnavailable,
    error,
  };
}
