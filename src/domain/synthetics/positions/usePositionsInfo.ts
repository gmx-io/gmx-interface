import { useMemo } from "react";

import { useIsApiHealthy } from "domain/api/apiHealthTracker";
import { useApiDataFallbackState } from "domain/api/useApiDataFallbackState";
import { useUserReferralInfoRequest } from "domain/referrals";
import { API_UI_FLAGS, useIsApiSdkEnabled } from "domain/synthetics/uiFlags/useIsApiSdkEnabled";
import { ApiDataSource } from "lib/metrics/types";
import { useApiDataFallbackCounter } from "lib/metrics/useApiDataFallbackCounter";
import { getByKey } from "lib/objects";
import { ContractsChainId } from "sdk/configs/chains";
import { ApiPositionInfo, getPositionInfo, PositionInfo } from "sdk/utils/positions";

import useUiFeeFactorRequest from "../fees/utils/useUiFeeFactor";
import { MarketsData, MarketsInfoData } from "../markets";
import { TokensData } from "../tokens";
import { PositionsInfoData } from "./types";
import { useApiPositionsInfoRequest } from "./useApiPositionsInfoRequest";
import { getAllPossiblePositionsKeys, useOptimisticPositionsInfo } from "./useOptimisticPositions";
import { usePositions } from "./usePositions";
import { usePositionsConstantsRequest } from "./usePositionsConstants";

function composeApiPositionInfo(apiPosition: ApiPositionInfo, marketsInfoData: MarketsInfoData): PositionInfo | null {
  const marketInfo = getByKey(marketsInfoData, apiPosition.marketAddress);

  if (!marketInfo) {
    return null;
  }

  const { indexToken, longToken, shortToken } = marketInfo;
  const collateralToken = apiPosition.collateralTokenAddress === longToken.address ? longToken : shortToken;
  const pnlToken = apiPosition.isLong ? longToken : shortToken;

  return {
    ...apiPosition,
    marketInfo,
    market: marketInfo,
    indexToken,
    longToken,
    shortToken,
    collateralToken,
    pnlToken,
  };
}

export type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
  error?: Error;
  dataSource?: ApiDataSource;
};

export function usePositionsInfoRequest(
  chainId: ContractsChainId,
  p: {
    account: string | undefined;
    marketsData?: MarketsData;
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    showPnlInLeverage: boolean;
    skipLocalReferralCode?: boolean;
  }
): PositionsInfoResult {
  const { showPnlInLeverage, marketsInfoData, tokensData, account, skipLocalReferralCode = false } = p;

  // Stale markets ⇒ gmx-api unhealthy ⇒ positions fall back to RPC globally too.
  const isApiHealthy = useIsApiHealthy(chainId);
  const isApiSdkEnabled = useIsApiSdkEnabled(API_UI_FLAGS.positions) && isApiHealthy;

  const {
    positionsInfoData: apiPositionsInfoData,
    isStale: isApiStale,
    error: apiError,
  } = useApiPositionsInfoRequest(chainId, { account, enabled: isApiSdkEnabled });

  const { shouldFallbackToRpc, isWaitingForInitialApiData, isInitialFallback } = useApiDataFallbackState({
    chainId,
    apiEnabled: isApiSdkEnabled,
    apiData: apiPositionsInfoData,
    isApiStale,
    apiError,
    isEnabled: Boolean(account),
    resetKey: account,
  });

  const { positionsData, error: positionsError } = usePositions(chainId, {
    account,
    marketsData: p.marketsData,
    tokensData,
    enabled: shouldFallbackToRpc,
  });

  const { positionsConstants, error: positionsConstantsError } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd } = positionsConstants || {};
  const { uiFeeFactor, error: uiFeeFactorError } = useUiFeeFactorRequest(chainId);
  const userReferralInfo = useUserReferralInfoRequest(chainId, account, skipLocalReferralCode);

  const rpcError = positionsError || positionsConstantsError || uiFeeFactorError || userReferralInfo?.error;

  const rpcPositionsInfoData = useMemo(() => {
    if (!shouldFallbackToRpc) {
      return undefined;
    }

    if (!marketsInfoData || !tokensData || !positionsData || minCollateralUsd === undefined) {
      return undefined;
    }

    return Object.keys(positionsData).reduce((acc: PositionsInfoData, positionKey: string) => {
      const position = getByKey(positionsData, positionKey)!;
      const marketInfo = getByKey(marketsInfoData, position.marketAddress);

      if (!marketInfo) {
        return acc;
      }

      acc[positionKey] = getPositionInfo({
        position,
        marketInfo,
        minCollateralUsd,
        userReferralInfo: userReferralInfo ?? undefined,
        showPnlInLeverage,
        uiFeeFactor,
      });

      return acc;
    }, {} as PositionsInfoData);
  }, [
    shouldFallbackToRpc,
    tokensData,
    positionsData,
    minCollateralUsd,
    marketsInfoData,
    showPnlInLeverage,
    userReferralInfo,
    uiFeeFactor,
  ]);

  const composedApiPositionsInfoData = useMemo(() => {
    if (!apiPositionsInfoData || !marketsInfoData) {
      return undefined;
    }

    return Object.entries(apiPositionsInfoData).reduce((acc: PositionsInfoData, [key, apiPosition]) => {
      const positionInfo = composeApiPositionInfo(apiPosition, marketsInfoData);
      if (positionInfo) {
        positionInfo.leverage = showPnlInLeverage ? positionInfo.leverageWithPnl : positionInfo.leverageWithoutPnl;
        acc[key] = positionInfo;
      }
      return acc;
    }, {} as PositionsInfoData);
  }, [apiPositionsInfoData, marketsInfoData, showPnlInLeverage]);

  const allPossiblePositionsKeys = useMemo(
    () => getAllPossiblePositionsKeys(account, marketsInfoData),
    [account, marketsInfoData]
  );

  const optimisticApiPositionsInfoData = useOptimisticPositionsInfo({
    positionsInfoData: composedApiPositionsInfoData,
    allPositionsKeys: allPossiblePositionsKeys.length > 0 ? allPossiblePositionsKeys : undefined,
    isLoading: !composedApiPositionsInfoData && isApiSdkEnabled && !apiError && !isApiStale,
    marketsInfoData,
  });

  const recomputedApiPositionsInfoData = useMemo(() => {
    if (!optimisticApiPositionsInfoData || !marketsInfoData || minCollateralUsd === undefined) {
      return undefined;
    }

    let hasRecomputed = false;
    const result: PositionsInfoData = {};

    for (const [key, position] of Object.entries(optimisticApiPositionsInfoData)) {
      const original = composedApiPositionsInfoData?.[key];

      const wasModifiedByEvent =
        !original ||
        original.sizeInUsd !== position.sizeInUsd ||
        original.collateralAmount !== position.collateralAmount ||
        original.sizeInTokens !== position.sizeInTokens;

      if (wasModifiedByEvent) {
        const marketInfo = getByKey(marketsInfoData, position.marketAddress);

        if (marketInfo) {
          result[key] = getPositionInfo({
            position,
            marketInfo,
            minCollateralUsd,
            userReferralInfo: userReferralInfo ?? undefined,
            showPnlInLeverage,
            uiFeeFactor,
          });
          hasRecomputed = true;
          continue;
        }
      }

      result[key] = position;
    }

    return hasRecomputed ? result : optimisticApiPositionsInfoData;
  }, [
    optimisticApiPositionsInfoData,
    composedApiPositionsInfoData,
    marketsInfoData,
    minCollateralUsd,
    userReferralInfo,
    showPnlInLeverage,
    uiFeeFactor,
  ]);

  const fallbackPositionsInfoData = rpcPositionsInfoData;
  const shouldUseApiPositionsInfoData =
    isApiSdkEnabled && Boolean(recomputedApiPositionsInfoData) && (!shouldFallbackToRpc || !fallbackPositionsInfoData);

  const positionsInfoData = useMemo(() => {
    if (shouldUseApiPositionsInfoData) {
      return recomputedApiPositionsInfoData;
    }
    return fallbackPositionsInfoData;
  }, [recomputedApiPositionsInfoData, fallbackPositionsInfoData, shouldUseApiPositionsInfoData]);

  const isLoading =
    Boolean(account) &&
    !positionsInfoData &&
    (isWaitingForInitialApiData
      ? true
      : shouldFallbackToRpc
        ? !fallbackPositionsInfoData && !shouldUseApiPositionsInfoData
        : isApiSdkEnabled);

  const dataSource: ApiDataSource | undefined = positionsInfoData
    ? shouldUseApiPositionsInfoData
      ? "api"
      : "rpc"
    : undefined;
  const error = shouldFallbackToRpc ? (fallbackPositionsInfoData ? undefined : rpcError) : apiError;

  useApiDataFallbackCounter({
    domain: "positions",
    chainId,
    apiEnabled: isApiSdkEnabled,
    apiData: apiPositionsInfoData,
    isApiStale,
    apiError,
    isInitialFallback,
    resetKey: account,
  });

  return {
    positionsInfoData,
    isLoading,
    error,
    dataSource,
  };
}
