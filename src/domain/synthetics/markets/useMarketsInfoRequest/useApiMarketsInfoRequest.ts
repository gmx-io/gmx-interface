import { useEffect, useMemo, useRef } from "react";
import { useSWRConfig } from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { ApiHealthTracker } from "domain/api/apiHealthTracker";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";

const CONFIG_REVALIDATION_THROTTLE_MS = 10_000;
export const MARKETS_STALE_THRESHOLD_MS = 10_000;

function getApiMarketsConfigRequestKey(chainId: ContractsChainId) {
  return ["apiMarketsConfigRequest", chainId] as const;
}

export function hasStaleMarketValues(
  configData: RawMarketConfig[] | undefined,
  valuesData: RawMarketValues[] | undefined,
  disabledAddresses: Set<string>
): boolean {
  if (!configData || !valuesData) {
    return false;
  }

  const now = Date.now();
  const valuesByAddress = new Map(valuesData.map((v) => [v.marketTokenAddress, v]));

  for (const config of configData) {
    if (disabledAddresses.has(config.marketTokenAddress)) {
      continue;
    }

    const value = valuesByAddress.get(config.marketTokenAddress);

    if (!value || value.updatedAt == null || now - value.updatedAt > MARKETS_STALE_THRESHOLD_MS) {
      return true;
    }
  }

  return false;
}

export function useApiMarketsInfoRequest(chainId: ContractsChainId, { enabled = true }: { enabled?: boolean } = {}) {
  const sdk = useGmxSdk(chainId);

  const {
    data: configData,
    isStale: isConfigStale,
    error: configError,
  } = useApiDataRequest<RawMarketConfig[]>(
    chainId,
    enabled && sdk ? getApiMarketsConfigRequestKey(chainId) : null,
    async () => sdk!.fetchMarketsConfig(),
    FreshnessMetricId.ApiMarketsInfo,
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  const {
    data: valuesData,
    isStale: isValuesStale,
    error: valuesError,
  } = useApiDataRequest<RawMarketValues[]>(
    chainId,
    enabled && sdk ? ["apiMarketsValuesRequest", chainId] : null,
    async () => sdk!.fetchMarketsValues(),
    FreshnessMetricId.ApiMarketsInfo
  );

  const { mutate } = useSWRConfig();
  const lastConfigRevalidationAtRef = useRef(0);

  // A newly listed market shows up in /values before the longer-cached /config — refetch config early.
  useEffect(() => {
    if (!configData || !valuesData) {
      return;
    }

    const configAddresses = new Set(configData.map((config) => config.marketTokenAddress));
    const hasUnknownMarket = valuesData.some((value) => !configAddresses.has(value.marketTokenAddress));

    if (!hasUnknownMarket || Date.now() - lastConfigRevalidationAtRef.current < CONFIG_REVALIDATION_THROTTLE_MS) {
      return;
    }

    lastConfigRevalidationAtRef.current = Date.now();
    mutate(getApiMarketsConfigRequestKey(chainId));
  }, [configData, valuesData, chainId, mutate]);

  const marketsInfoData = useMemo<RawMarketsInfoData | undefined>(() => {
    if (!configData || !valuesData) {
      return undefined;
    }

    return mergeMarketsConfigValues(configData, valuesData);
  }, [configData, valuesData]);

  // Exclude disabled markets — they are never pulled (updatedAt null) and would pin the API permanently stale.
  const disabledMarketAddresses = useMemo(
    () => new Set((configData ?? []).filter((config) => config.isDisabled).map((config) => config.marketTokenAddress)),
    [configData]
  );

  const isMarketsDataStale = useMemo(() => {
    const stale = hasStaleMarketValues(configData, valuesData, disabledMarketAddresses);
    if (configData) {
      ApiHealthTracker.getInstance().reportMarketsFreshness(chainId, stale);
    }
    return stale;
  }, [chainId, configData, valuesData, disabledMarketAddresses]);

  return {
    marketsInfoData,
    isStale: isValuesStale || isConfigStale || isMarketsDataStale,
    error: valuesError ?? configError,
  };
}
