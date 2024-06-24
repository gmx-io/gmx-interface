import { useUserReferralInfoRequest } from "domain/referrals";
import { getBasisPoints } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { getPositionFee, getPriceImpactForPosition } from "../fees";
import { MarketsInfoData, getMaxAllowedLeverageByMinCollateralFactor } from "../markets";
import { TokensData, convertToTokenAmount, convertToUsd } from "../tokens";
import { getMarkPrice } from "../trade";
import { PositionsInfoData } from "./types";
import { usePositionsConstantsRequest } from "./usePositionsConstants";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionNetValue,
  getPositionPendingFeesUsd,
  getPositionPnlUsd,
} from "./utils";
import { usePositions } from "./usePositions";
import useWallet from "lib/wallets/useWallet";
import useUiFeeFactor from "../fees/utils/useUiFeeFactor";

export type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
};

export function usePositionsInfoRequest(
  chainId: number,
  p: {
    account: string | null | undefined;
    marketsInfoData?: MarketsInfoData;
    tokensData?: TokensData;
    pricesUpdatedAt?: number;
    showPnlInLeverage: boolean;
    skipLocalReferralCode?: boolean;
  }
): PositionsInfoResult {
  const { showPnlInLeverage, marketsInfoData, tokensData, account, skipLocalReferralCode = false } = p;

  const { signer } = useWallet();
  const { positionsData } = usePositions(chainId, p);
  const { minCollateralUsd } = usePositionsConstantsRequest(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);

  return useMemo(() => {
    if (!marketsInfoData || !tokensData || !positionsData || minCollateralUsd === undefined) {
      return {
        isLoading: true,
      };
    }

    const positionsInfoData = Object.keys(positionsData).reduce((acc: PositionsInfoData, positionKey: string) => {
      const position = getByKey(positionsData, positionKey)!;

      const marketInfo = getByKey(marketsInfoData, position.marketAddress);
      const indexToken = marketInfo?.indexToken;
      const pnlToken = position.isLong ? marketInfo?.longToken : marketInfo?.shortToken;
      const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

      if (!marketInfo || !indexToken || !pnlToken || !collateralToken) {
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
        marketInfo.longToken.decimals,
        marketInfo.longToken.prices.minPrice
      )!;
      const pendingClaimableFundingFeesShortUsd = convertToUsd(
        position.claimableShortTokenAmount,
        marketInfo.shortToken.decimals,
        marketInfo.shortToken.prices.minPrice
      )!;

      const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd + pendingClaimableFundingFeesShortUsd;

      const totalPendingFeesUsd = getPositionPendingFeesUsd({
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd,
      });

      const closingPriceImpactDeltaUsd = getPriceImpactForPosition(
        marketInfo,
        position.sizeInUsd * -1n,
        position.isLong,
        { fallbackToZero: true }
      );

      const positionFeeInfo = getPositionFee(
        marketInfo,
        position.sizeInUsd,
        closingPriceImpactDeltaUsd > 0,
        userReferralInfo,
        uiFeeFactor
      );

      const closingFeeUsd = positionFeeInfo.positionFeeUsd;
      const uiFeeUsd = positionFeeInfo.uiFeeUsd ?? 0n;

      const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;

      const remainingCollateralUsd = collateralUsd - totalPendingFeesUsd;

      const remainingCollateralAmount = convertToTokenAmount(
        remainingCollateralUsd,
        collateralToken.decimals,
        collateralMinPrice
      )!;

      const pnl = getPositionPnlUsd({
        marketInfo: marketInfo,
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        markPrice,
        isLong: position.isLong,
      });

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

      const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);

      const hasLowCollateral = (leverage !== undefined && leverage > maxAllowedLeverage) || false;

      const liquidationPrice = getLiquidationPrice({
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
      });

      acc[positionKey] = {
        ...position,
        marketInfo,
        indexToken,
        collateralToken,
        pnlToken,
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
  }, [marketsInfoData, minCollateralUsd, positionsData, showPnlInLeverage, tokensData, userReferralInfo, uiFeeFactor]);
}
