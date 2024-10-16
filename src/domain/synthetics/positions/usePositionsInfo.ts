import { useUserReferralInfoRequest } from "domain/referrals";
import { getBasisPoints } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import useUiFeeFactorRequest from "../fees/utils/useUiFeeFactor";
import {
  getMarketIndexName,
  getMarketPoolName,
  getMaxAllowedLeverageByMinCollateralFactor,
  MarketsData,
  MarketsInfoData,
} from "../markets";
import { TokensData, convertToTokenAmount, convertToUsd } from "../tokens";
import { getMarkPrice } from "../trade";
import { PositionsData, PositionsInfoData } from "./types";
import { usePositionsConstantsRequest } from "./usePositionsConstants";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionNetValue,
  getPositionPendingFeesUsd,
} from "./utils";
import { convertTokenAddress } from "config/tokens";

export type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
  error?: Error;
};

export function usePositionsInfoRequest(
  chainId: number,
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
  const {
    positionsConstants: { minCollateralUsd },
    error: positionsConstantsError,
  } = usePositionsConstantsRequest(chainId);
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

      const pnl = position.pnl;

      const pnlPercentage =
        collateralUsd !== undefined && collateralUsd != 0n ? getBasisPoints(pnl, collateralUsd) : 0n;

      const netValue = getPositionNetValue({
        collateralUsd: collateralUsd,
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
        closingFeeUsd,
        uiFeeUsd,
      });

      const pnlAfterFees = pnl - totalPendingFeesUsd - closingFeeUsd - uiFeeUsd;
      const pnlAfterFeesPercentage =
        collateralUsd != 0n ? getBasisPoints(pnlAfterFees, collateralUsd + closingFeeUsd) : 0n;

      const leverage = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: collateralUsd,
        pnl: showPnlInLeverage ? pnl : undefined,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
      });

      const leverageWithPnl = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: collateralUsd,
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
      });

      const maxAllowedLeverage = marketInfo
        ? getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor)
        : undefined;

      const hasLowCollateral =
        (leverage !== undefined && maxAllowedLeverage !== undefined && leverage > maxAllowedLeverage) || false;

      const liquidationPrice = marketInfo
        ? getLiquidationPrice({
            marketInfo,
            collateralToken,
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
