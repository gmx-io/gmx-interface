import { useMemo } from "react";

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

  const {
    marketsInfoData: apiMarketsInfoData,
    isStale: isApiStale,
    error: apiError,
  } = useApiMarketsInfoRequest(chainId);

  const shouldFallbackToRpc = apiError || isApiStale;

  const { marketsAddresses, marketsData, marketsValuesData, marketsConfigsData, marketsConstants } =
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

    if (!marketsAddresses || !rpcMarketsInfoDataReady) {
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
    apiMarketsInfoData,
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
