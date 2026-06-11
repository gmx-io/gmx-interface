import { useEffect, useMemo, useRef } from "react";
import { useSWRConfig } from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useApiDataRequest } from "domain/synthetics/common/useApiDataRequest";
import { FreshnessMetricId } from "lib/metrics";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";

const CONFIG_REVALIDATION_THROTTLE_MS = 10_000;

function getApiMarketsConfigRequestKey(chainId: ContractsChainId) {
  return ["apiMarketsConfigRequest", chainId] as const;
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

  return {
    marketsInfoData,
    isStale: isValuesStale || isConfigStale,
    error: valuesError ?? configError,
  };
}
