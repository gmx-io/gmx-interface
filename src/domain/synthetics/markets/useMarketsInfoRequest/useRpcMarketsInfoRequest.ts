import { useEffect, useMemo } from "react";

import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { getMarketDivisor } from "domain/synthetics/markets/utils";
import type { TokensData } from "domain/synthetics/tokens";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL, FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";
import {
  buildMarketsConfigsRequest,
  buildMarketsValuesRequest,
  parseMarketsConfigsResponse,
  parseMarketsValuesResponse,
} from "sdk/utils/markets/multicall";
import type { MarketsData } from "sdk/utils/markets/types";

import { useFastMarketsInfoRequest } from "./useFastMarketsInfoRequest";
import { useMarketsConstantsRequest } from "./useMarketsConstantsRequest";

export function useRpcMarketsInfoRequest({
  chainId,
  tokensData,
  enabled = true,
}: {
  chainId: ContractsChainId;
  tokensData: TokensData | undefined;
  enabled?: boolean;
}) {
  const { fastMarketInfoData } = useFastMarketsInfoRequest(chainId);
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { data: marketsConstantsData } = useMarketsConstantsRequest(chainId);
  const isDependenciesLoading = !marketsAddresses || !tokensData || !marketsConstantsData || !enabled;

  const { marketsValuesData } = useMarketsValuesRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
    marketsData,
    tokensData,
  });

  const { marketsConfigsData } = useMarketsConfigsRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
  });

  return {
    fastMarketInfoData,
    marketsData,
    marketsAddresses,
    marketsValuesData,
    marketsConfigsData,
    marketsConstants: marketsConstantsData,
  };
}

function useMarketsValuesRequest({
  chainId,
  isDependenciesLoading,
  marketsAddresses,
  marketsData,
  tokensData,
}: {
  chainId: ContractsChainId;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  tokensData: TokensData | undefined;
}) {
  const { data: marketsValuesData } = useMulticall(chainId, `useMarketsValuesRequest`, {
    key:
      !isDependenciesLoading && marketsAddresses?.length && marketsAddresses.length > 0 ? [...marketsAddresses] : null,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsValuesRequest(chainId, {
        marketsAddresses,
        marketsData,
        tokensData,
      }),
    parseResponse: (res) => {
      return parseMarketsValuesResponse(res, marketsAddresses!, marketsData, getMarketDivisor);
    },
  });

  useEffect(() => {
    freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.MarketsValues);
  }, [chainId, marketsValuesData]);

  return useMemo(
    () => ({
      marketsValuesData,
    }),
    [marketsValuesData]
  );
}

function useMarketsConfigsRequest({
  chainId,
  isDependenciesLoading,
  marketsAddresses,
}: {
  chainId: ContractsChainId;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
}) {
  const { data: marketsConfigsData } = useMulticall(chainId, "useMarketsConfigsRequest", {
    key: !isDependenciesLoading && marketsAddresses!.length > 0 && [marketsAddresses],

    refreshInterval: CONFIG_UPDATE_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsConfigsRequest(chainId, {
        marketsAddresses,
      }),
    parseResponse: (res) => {
      return parseMarketsConfigsResponse(res, marketsAddresses!);
    },
  });

  useEffect(() => {
    freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.MarketsConfigs);
  }, [chainId, marketsConfigsData]);

  return useMemo(
    () => ({
      marketsConfigsData,
    }),
    [marketsConfigsData]
  );
}
