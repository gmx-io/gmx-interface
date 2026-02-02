import { useMemo } from "react";

import { getIsFlagEnabled } from "config/ab";
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
};

export function useMarketsInfoRequest(
  chainId: ContractsChainId,
  { tokensData }: { tokensData: TokensData | undefined }
): MarketsInfoResult {
  const { claimableFundingData } = useClaimableFundingDataRequest(chainId);

  const isApiSdkEnabled = getIsFlagEnabled("apiSdk");

  const {
    marketsInfoData: apiMarketsInfoData,
    isStale: isApiStale,
    error: apiError,
  } = useApiMarketsInfoRequest(chainId, { enabled: isApiSdkEnabled });

  const shouldFallbackToRpc = !isApiSdkEnabled || apiError || isApiStale;

  const { marketsAddresses, fastMarketInfoData, marketsData, marketsValuesData, marketsConfigsData, marketsConstants } =
    useRpcMarketsInfoRequest({
      chainId,
      tokensData,
      enabled: shouldFallbackToRpc,
    });

  const rpcMarketsInfoDataReady = marketsData && marketsValuesData && marketsConfigsData && marketsConstants;

  const rawMarketsInfoData = useMemo((): RawMarketsInfoData | undefined => {
    if (apiMarketsInfoData) {
      return apiMarketsInfoData as RawMarketsInfoData;
    }

    if (fastMarketInfoData) {
      return fastMarketInfoData;
    }

    if (marketsAddresses && rpcMarketsInfoDataReady) {
      return composeRawMarketsInfoData({
        marketsAddresses,
        marketsData,
        marketsValuesData,
        marketsConfigsData,
        marketsConstants,
      });
    }

    return undefined;
  }, [
    apiMarketsInfoData,
    fastMarketInfoData,
    marketsAddresses,
    rpcMarketsInfoDataReady,
    marketsData,
    marketsValuesData,
    marketsConfigsData,
    marketsConstants,
  ]);

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

  return {
    marketsInfoData: mergedData,
    error: apiError,
    isLoading: shouldFallbackToRpc && !rpcMarketsInfoDataReady,
  };
}
