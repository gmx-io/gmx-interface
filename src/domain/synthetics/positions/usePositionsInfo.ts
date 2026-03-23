import { useMemo } from "react";

import { useUserReferralInfoRequest } from "domain/referrals";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { ContractsChainId } from "sdk/configs/chains";
import { ApiPositionInfo, getPositionInfo, PositionInfo } from "sdk/utils/positions";

import useUiFeeFactorRequest from "../fees/utils/useUiFeeFactor";
import { MarketsInfoData } from "../markets";
import { TokensData } from "../tokens";
import { PositionsData, PositionsInfoData } from "./types";
import { useApiPositionsInfoRequest } from "./useApiPositionsInfoRequest";
import { getAllPossiblePositionsKeys, useOptimisticPositionsInfo } from "./useOptimisticPositions";
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
};

export function usePositionsInfoRequest(
  chainId: ContractsChainId,
  p: {
    account: string | null | undefined;
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    positionsData?: PositionsData;
    positionsError?: Error;
    showPnlInLeverage: boolean;
    skipLocalReferralCode?: boolean;
  }
): PositionsInfoResult {
  const {
    showPnlInLeverage,
    marketsInfoData,
    tokensData,
    account,
    skipLocalReferralCode = false,
    positionsData,
    positionsError,
  } = p;

  const isApiSdkEnabled = false;

  const {
    positionsInfoData: apiPositionsInfoData,
    isStale: isApiStale,
    error: apiError,
  } = useApiPositionsInfoRequest(chainId, { account, enabled: isApiSdkEnabled });

  const shouldFallbackToRpc = !isApiSdkEnabled || apiError || isApiStale;

  const { signer } = useWallet();
  const { positionsConstants, error: positionsConstantsError } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd } = positionsConstants || {};
  const { uiFeeFactor, error: uiFeeFactorError } = useUiFeeFactorRequest(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);

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

  const positionsInfoData = useMemo(() => {
    if (recomputedApiPositionsInfoData && !isApiStale && !apiError) {
      return recomputedApiPositionsInfoData;
    }
    return rpcPositionsInfoData;
  }, [recomputedApiPositionsInfoData, isApiStale, apiError, rpcPositionsInfoData]);

  const isLoading =
    !positionsInfoData && (shouldFallbackToRpc ? !rpcPositionsInfoData : !recomputedApiPositionsInfoData);

  return {
    positionsInfoData,
    isLoading,
    error: shouldFallbackToRpc ? rpcError : apiError,
  };
}
