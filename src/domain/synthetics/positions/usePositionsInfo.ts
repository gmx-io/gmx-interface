import { useMemo } from "react";

import { useUserReferralInfoRequest } from "domain/referrals";
import { BASIS_POINTS_DIVISOR_BIGINT, getBasisPoints } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { ContractsChainId } from "sdk/configs/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import {
  getEntryPrice,
  getNetPriceImpactDeltaUsdForDecrease,
  getPositionPnlAfterFees,
  getPositionPnlUsd,
} from "sdk/utils/positions";

import useUiFeeFactorRequest from "../fees/utils/useUiFeeFactor";
import {
  MarketsData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxAllowedLeverageByMinCollateralFactor,
} from "../markets";
import { TokensData, convertToTokenAmount, convertToUsd } from "../tokens";
import { getAcceptablePriceInfo, getMarkPrice } from "../trade";
import { PositionsData, PositionsInfoData } from "./types";
import { usePositionsConstantsRequest } from "./usePositionsConstants";
import { getLeverage, getLiquidationPrice, getPositionNetValue, getPositionPendingFeesUsd } from "./utils";
import { bigMath } from "sdk/utils/bigmath";

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
    marketsData?: MarketsData;
    tokensData?: TokensData;
    positionsData?: PositionsData;
    positionsError?: Error;
    showPnlInLeverage: boolean;
    skipLocalReferralCode?: boolean;
  }
): PositionsInfoResult {
  const {
    showPnlInLeverage,
    marketsData,
    marketsInfoData,
    tokensData,
    account,
    skipLocalReferralCode = false,
    positionsData,
    positionsError,
  } = p;

  const { signer } = useWallet();
  const { positionsConstants, error: positionsConstantsError } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd } = positionsConstants || {};
  const { error: uiFeeFactorError } = useUiFeeFactorRequest(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);

  const error = positionsError || positionsConstantsError || uiFeeFactorError || userReferralInfo?.error;

  return useMemo(() => {
    if (error) {
      return {
        isLoading: false,
        error,
      };
    }

    if (!marketsData || !tokensData || !positionsData || minCollateralUsd === undefined) {
      return {
        isLoading: true,
      };
    }

    const positionsInfoData = Object.keys(positionsData).reduce((acc: PositionsInfoData, positionKey: string) => {
      const position = getByKey(positionsData, positionKey)!;

      const marketInfo = getByKey(marketsInfoData, position.marketAddress);
      const market = getByKey(marketsData, position.marketAddress);
      const indexToken = market
        ? getByKey(tokensData, convertTokenAddress(chainId, market.indexTokenAddress, "native"))
        : undefined;
      const longToken = getByKey(tokensData, market?.longTokenAddress);
      const shortToken = getByKey(tokensData, market?.shortTokenAddress);
      const pnlToken = position.isLong ? longToken : shortToken;
      const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

      if (!market || !indexToken || !longToken || !shortToken || !pnlToken || !collateralToken) {
        return acc;
      }

      const markPrice = getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false });
      const collateralMinPrice = collateralToken.prices.minPrice;

      const entryPrice = getEntryPrice({
        sizeInTokens: position.sizeInTokens,
        sizeInUsd: position.sizeInUsd,
        indexToken,
      });

      const pendingFundingFeesUsd = convertToUsd(
        position.fundingFeeAmount,
        collateralToken.decimals,
        collateralToken.prices.minPrice
      )!;

      const pendingClaimableFundingFeesLongUsd = convertToUsd(
        position.claimableLongTokenAmount,
        longToken.decimals,
        longToken.prices.minPrice
      )!;
      const pendingClaimableFundingFeesShortUsd = convertToUsd(
        position.claimableShortTokenAmount,
        shortToken.decimals,
        shortToken.prices.minPrice
      )!;

      const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd + pendingClaimableFundingFeesShortUsd;

      const totalPendingFeesUsd = getPositionPendingFeesUsd({
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd,
      });

      const closingFeeAmount = position.positionFeeAmount - position.traderDiscountAmount;
      const closingFeeUsd = convertToUsd(closingFeeAmount, collateralToken.decimals, collateralToken.prices.minPrice)!;
      const uiFeeUsd = convertToUsd(position.uiFeeAmount, collateralToken.decimals, collateralToken.prices.minPrice)!;

      const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;

      const remainingCollateralUsd = collateralUsd - totalPendingFeesUsd;

      const remainingCollateralAmount = convertToTokenAmount(
        remainingCollateralUsd,
        collateralToken.decimals,
        collateralMinPrice
      )!;

      const pnl = marketInfo
        ? getPositionPnlUsd({
            marketInfo: marketInfo,
            sizeInUsd: position.sizeInUsd,
            isLong: position.isLong,
            markPrice: getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false }),
            sizeInTokens: position.sizeInTokens,
          })
        : position.pnl;

      const pnlPercentage =
        collateralUsd !== undefined && collateralUsd != 0n ? getBasisPoints(pnl, collateralUsd) : 0n;

      const closeAcceptablePriceInfo = marketInfo
        ? getAcceptablePriceInfo({
            marketInfo,
            isIncrease: false,
            isLimit: false,
            isLong: position.isLong,
            indexPrice: getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false }),
            sizeDeltaUsd: position.sizeInUsd,
          })
        : undefined;

      const netPriceImapctValues =
        marketInfo && closeAcceptablePriceInfo
          ? getNetPriceImpactDeltaUsdForDecrease({
              marketInfo,
              sizeInUsd: position.sizeInUsd,
              pendingImpactAmount: position.pendingImpactAmount,
              sizeDeltaUsd: position.sizeInUsd,
              priceImpactDeltaUsd: closeAcceptablePriceInfo.priceImpactDeltaUsd,
            })
          : undefined;

      const netValue = getPositionNetValue({
        collateralUsd: collateralUsd,
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
        closingFeeUsd,
        uiFeeUsd,
        totalPendingImpactDeltaUsd: netPriceImapctValues?.totalImpactDeltaUsd ?? 0n,
        priceImpactDiffUsd: netPriceImapctValues?.priceImpactDiffUsd ?? 0n,
      });

      const pnlAfterFees = getPositionPnlAfterFees({
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
        closingFeeUsd,
        uiFeeUsd,
        totalPendingImpactDeltaUsd: netPriceImapctValues?.totalImpactDeltaUsd ?? 0n,
        priceImpactDiffUsd: netPriceImapctValues?.priceImpactDiffUsd ?? 0n,
      });

      const pnlAfterFeesPercentage =
        collateralUsd != 0n ? getBasisPoints(pnlAfterFees, collateralUsd + closingFeeUsd) : 0n;

      const leverage = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: collateralUsd,
        pnl: showPnlInLeverage ? pnl : undefined,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
      });

      const leverageWithPnl =
        netValue !== undefined && netValue !== 0n
          ? bigMath.mulDiv(position.sizeInUsd, BASIS_POINTS_DIVISOR_BIGINT, netValue)
          : leverage;

      const maxAllowedLeverage = marketInfo
        ? getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor)
        : undefined;

      const hasLowCollateral =
        (leverage !== undefined && maxAllowedLeverage !== undefined && leverage > maxAllowedLeverage) || false;

      const liquidationPrice = marketInfo
        ? getLiquidationPrice({
            marketInfo,
            collateralToken,
            pendingImpactAmount: position.pendingImpactAmount,
            sizeInUsd: position.sizeInUsd,
            sizeInTokens: position.sizeInTokens,
            collateralUsd,
            collateralAmount: position.collateralAmount,
            userReferralInfo,
            minCollateralUsd,
            pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
            pendingFundingFeesUsd,
            isLong: position.isLong,
          })
        : undefined;

      const indexName = getMarketIndexName({ indexToken, isSpotOnly: false });
      const poolName = getMarketPoolName({ longToken, shortToken });

      acc[positionKey] = {
        ...position,
        market,
        marketInfo,
        indexName,
        poolName,
        indexToken,
        collateralToken,
        pnlToken,
        longToken,
        shortToken,
        markPrice,
        entryPrice,
        liquidationPrice,
        collateralUsd,
        remainingCollateralUsd,
        remainingCollateralAmount,
        hasLowCollateral,
        leverage,
        leverageWithPnl,
        pnl,
        pnlPercentage,
        pnlAfterFees,
        pnlAfterFeesPercentage,
        netValue,
        netPriceImapctDeltaUsd: netPriceImapctValues?.totalImpactDeltaUsd ?? 0n,
        priceImpactDiffUsd: netPriceImapctValues?.priceImpactDiffUsd ?? 0n,
        closingFeeUsd,
        uiFeeUsd,
        pendingFundingFeesUsd,
        pendingClaimableFundingFeesUsd,
      };

      return acc;
    }, {} as PositionsInfoData);

    return {
      positionsInfoData,
      isLoading: false,
    };
  }, [
    error,
    marketsData,
    tokensData,
    positionsData,
    minCollateralUsd,
    marketsInfoData,
    chainId,
    showPnlInLeverage,
    userReferralInfo,
  ]);
}
