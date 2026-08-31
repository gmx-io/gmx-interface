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

const PREBUILT_KEYS_WARMUP_DELAY = 5000;

// Prefetches the code-split prebuilt key map chunks off the boot critical path,
// so the RPC fallback request builders never wait on a chunk download.
function usePrebuiltKeysWarmup() {
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      import("sdk/codegen/prebuilt/hashedMarketValuesKeys.json").catch(() => undefined);
      import("sdk/codegen/prebuilt/hashedMarketConfigKeys.json").catch(() => undefined);
    }, PREBUILT_KEYS_WARMUP_DELAY);

    return () => window.clearTimeout(timerId);
  }, []);
}

export function useRpcMarketsInfoRequest({
  chainId,
  tokensData,
  enabled = true,
}: {
  chainId: ContractsChainId;
  tokensData: TokensData | undefined;
  enabled?: boolean;
}) {
  usePrebuiltKeysWarmup();

  const { fastMarketInfoData } = useFastMarketsInfoRequest(chainId, { enabled });
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { data: marketsConstantsData } = useMarketsConstantsRequest(chainId, { enabled });
  const isDependenciesLoading = !marketsAddresses || !tokensData || !enabled;

  const { marketsConfigsData } = useMarketsConfigsRequest({
    chainId,
    isDependenciesLoading,
    marketsAddresses,
    marketsData,
  });

  const { marketsValuesData } = useMarketsValuesRequest({
    chainId,
    isDependenciesLoading: isDependenciesLoading || !marketsConfigsData,
    marketsAddresses,
    marketsData,
    marketsConfigsData,
    tokensData,
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
  marketsConfigsData,
  tokensData,
}: {
  chainId: ContractsChainId;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  marketsConfigsData: ReturnType<typeof parseMarketsConfigsResponse> | undefined;
  tokensData: TokensData | undefined;
}) {
  const { data: marketsValuesData } = useMulticall(chainId, `useMarketsValuesRequest`, {
    key: !isDependenciesLoading && marketsAddresses?.length && marketsAddresses.length > 0 ? marketsAddresses : null,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsValuesRequest(chainId, {
        marketsAddresses,
        marketsData,
        marketsConfigsData,
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
  marketsData,
}: {
  chainId: ContractsChainId;
  isDependenciesLoading: boolean;
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
}) {
  const { data: marketsConfigsData } = useMulticall(chainId, "useMarketsConfigsRequest", {
    key: !isDependenciesLoading && marketsAddresses!.length > 0 && [marketsAddresses],

    refreshInterval: CONFIG_UPDATE_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketsConfigsRequest(chainId, {
        marketsAddresses,
        marketsData,
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
