import { useMemo } from "react";

import { useApiDataFallbackState } from "domain/api/useApiDataFallbackState";
import { API_UI_FLAGS, useIsApiSdkEnabled } from "domain/synthetics/uiFlags/useIsApiSdkEnabled";
import { ApiDataSource } from "lib/metrics/types";
import { useApiDataFallbackCounter } from "lib/metrics/useApiDataFallbackCounter";
import type { ContractsChainId } from "sdk/configs/chains";
import { composeFullMarketsInfoData, composeRawMarketsInfoData } from "sdk/utils/markets";
import type { MarketsInfoData, RawMarketsInfoData } from "sdk/utils/markets/types";

import type { TokensData } from "../../tokens";
import { useClaimableFundingDataRequest } from "../useClaimableFundingDataRequest";
import { useApiMarketsInfoRequest } from "./useApiMarketsInfoRequest";
import { useRpcMarketsInfoRequest } from "./useRpcMarketsInfoRequest";

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  error?: Error;
  isLoading: boolean;
  dataSource?: ApiDataSource;
};

export function useMarketsInfoRequest(
  chainId: ContractsChainId,
  { tokensData }: { tokensData: TokensData | undefined }
): MarketsInfoResult {
  const { claimableFundingData } = useClaimableFundingDataRequest(chainId);

  const isApiSdkEnabled = useIsApiSdkEnabled(API_UI_FLAGS.markets);

  const {
    marketsInfoData: apiMarketsInfoData,
    isStale: isApiStale,
    error: apiError,
  } = useApiMarketsInfoRequest(chainId, { enabled: isApiSdkEnabled });

  const {
    hasApiData: hasApiMarketsInfoData,
    shouldFallbackToRpc,
    isWaitingForInitialApiData,
    isInitialFallback,
  } = useApiDataFallbackState({
    chainId,
    apiEnabled: isApiSdkEnabled,
    apiData: apiMarketsInfoData,
    isApiStale,
    apiError,
  });

  const { marketsAddresses, fastMarketInfoData, marketsData, marketsValuesData, marketsConfigsData, marketsConstants } =
    useRpcMarketsInfoRequest({
      chainId,
      tokensData,
      enabled: shouldFallbackToRpc,
    });

  const rpcMarketsInfoDataReady = marketsData && marketsValuesData && marketsConfigsData && marketsConstants;

  const fullRpcMarketsInfoData = useMemo((): RawMarketsInfoData | undefined => {
    if (!shouldFallbackToRpc || !marketsAddresses || !rpcMarketsInfoDataReady) {
      return undefined;
    }

    return composeRawMarketsInfoData({
      marketsAddresses,
      marketsData,
      marketsValuesData,
      marketsConfigsData,
      marketsConstants,
    });
  }, [
    shouldFallbackToRpc,
    marketsAddresses,
    rpcMarketsInfoDataReady,
    marketsData,
    marketsValuesData,
    marketsConfigsData,
    marketsConstants,
  ]);

  const fallbackMarketsInfoData = fullRpcMarketsInfoData || (!hasApiMarketsInfoData ? fastMarketInfoData : undefined);
  const shouldUseApiMarketsInfoData =
    isApiSdkEnabled && Boolean(apiMarketsInfoData) && (!shouldFallbackToRpc || !fallbackMarketsInfoData);

  const rawMarketsInfoData = useMemo((): RawMarketsInfoData | undefined => {
    if (shouldUseApiMarketsInfoData) {
      return apiMarketsInfoData as RawMarketsInfoData;
    }

    return fallbackMarketsInfoData;
  }, [apiMarketsInfoData, fallbackMarketsInfoData, shouldUseApiMarketsInfoData]);

  const mergedData = useMemo(() => {
    if (!marketsAddresses || !tokensData || !rawMarketsInfoData) {
      return undefined;
    }

    return composeFullMarketsInfoData({
      chainId,
      marketsAddresses,
      rawMarketsInfoData,
      tokensData,
      claimableFundingData,
    });
  }, [marketsAddresses, tokensData, rawMarketsInfoData, chainId, claimableFundingData]);

  const dataSource: ApiDataSource | undefined = mergedData ? (shouldUseApiMarketsInfoData ? "api" : "rpc") : undefined;
  const isLoading =
    isWaitingForInitialApiData || (shouldFallbackToRpc && !fallbackMarketsInfoData && !shouldUseApiMarketsInfoData);
  const error = shouldFallbackToRpc ? undefined : apiError;

  useApiDataFallbackCounter({
    domain: "markets",
    chainId,
    apiEnabled: isApiSdkEnabled,
    apiData: apiMarketsInfoData,
    isApiStale,
    apiError,
    isInitialFallback,
  });

  return {
    marketsInfoData: mergedData,
    error,
    isLoading,
    dataSource,
  };
}
