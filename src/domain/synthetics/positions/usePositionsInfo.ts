import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "lib/legacy";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { getPositionFee } from "../fees";
import { useMarketsInfo } from "../markets";
import { convertToTokenAmount, convertToUsd, useAvailableTokensData } from "../tokens";
import { PositionsInfoData } from "./types";
import { useOptimisticPositions } from "./useOptimisticPositions";
import { usePositionsConstants } from "./usePositionsConstants";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionNetValue,
  getPositionPendingFeesUsd,
  getPositionPnlUsd,
} from "./utils";
import { getMarkPrice } from "../trade";
import { getBasisPoints } from "lib/numbers";
import { useUserReferralInfo } from "domain/referrals";
import { useWeb3React } from "@web3-react/core";

type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
};

export function usePositionsInfo(chainId: number, p: { showPnlInLeverage: boolean }): PositionsInfoResult {
  const { showPnlInLeverage } = p;

  const { account, library } = useWeb3React();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { optimisticPositionsData } = useOptimisticPositions(chainId);
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const userReferralInfo = useUserReferralInfo(library, chainId, account);

  return useMemo(() => {
    if (!marketsInfoData || !tokensData || !optimisticPositionsData || !minCollateralUsd) {
      return {
        isLoading: true,
      };
    }

    const positionsInfoData = Object.keys(optimisticPositionsData).reduce(
      (acc: PositionsInfoData, positionKey: string) => {
        const position = getByKey(optimisticPositionsData, positionKey)!;

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

        const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd?.add(
          pendingClaimableFundingFeesShortUsd
        );

        const totalPendingFeesUsd = getPositionPendingFeesUsd({
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd,
        });

        const positionFeeInfo = getPositionFee(marketInfo, position.sizeInUsd, userReferralInfo);
        const closingFeeUsd = positionFeeInfo.positionFeeUsd;

        const initialCollateralUsd = convertToUsd(
          position.collateralAmount,
          collateralToken.decimals,
          collateralMinPrice
        )!;

        const remainingCollateralUsd = initialCollateralUsd.sub(totalPendingFeesUsd);

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
          initialCollateralUsd && !initialCollateralUsd.eq(0)
            ? getBasisPoints(pnl, initialCollateralUsd)
            : BigNumber.from(0);

        const netValue = getPositionNetValue({
          collateralUsd: initialCollateralUsd,
          pnl,
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
          closingFeeUsd,
        });

        const pnlAfterFees = pnl.sub(totalPendingFeesUsd).sub(closingFeeUsd);

        const pnlAfterFeesPercentage =
          // while calculating delta percentage after fees, we need to add opening fee (which is equal to closing fee) to collateral
          !initialCollateralUsd.eq(0)
            ? pnlAfterFees.mul(BASIS_POINTS_DIVISOR).div(initialCollateralUsd.add(closingFeeUsd))
            : BigNumber.from(0);

        const leverage = getLeverage({
          sizeInUsd: position.sizeInUsd,
          collateralUsd: initialCollateralUsd,
          pnl: showPnlInLeverage ? pnl : undefined,
          pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
        });

        const hasLowCollateral = leverage?.gt(MAX_ALLOWED_LEVERAGE) || false;

        const liquidationPrice = getLiquidationPrice({
          sizeInUsd: position.sizeInUsd,
          collateralUsd: initialCollateralUsd,
          pnl,
          markPrice,
          closingFeeUsd,
          maxPriceImpactFactor: marketInfo.maxPositionImpactFactorForLiquidations,
          minCollateralFactor: marketInfo.minCollateralFactor,
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
          initialCollateralUsd,
          remainingCollateralUsd,
          remainingCollateralAmount,
          hasLowCollateral,
          leverage,
          pnl,
          pnlPercentage,
          pnlAfterFees,
          pnlAfterFeesPercentage,
          netValue,
          closingFeeUsd,
          pendingFundingFeesUsd,
          pendingClaimableFundingFeesUsd,
        };

        return acc;
      },
      {} as PositionsInfoData
    );

    return {
      positionsInfoData,
      isLoading: false,
    };
  }, [marketsInfoData, minCollateralUsd, optimisticPositionsData, showPnlInLeverage, tokensData, userReferralInfo]);
}
