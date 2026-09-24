import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositions } from './baseSelectors';
import { selectTokensData } from '../token/selectTokensData';
import { getByKey } from '@/utils/lib/object';
import { BN_TWO, BN_ZERO, ONE_USD } from '@/config/constants';
import { getPositionPendingBorrowingFeesUsd } from '@/utils/position/getPositionPendingBorrowingFeesUsd';
import { getPositionPendingFundingFeesUsd } from '@/utils/position/getPositionPendingFundingFeeUsd';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { getPositionPendingClaimableFundingFeesUsd } from '@/utils/position/getPositionPendingClaimableFundingFeesUsd';
import { getPositionEntryPrice } from '@/utils/position/getPositionEntryPrice';
import { getPositionPnlUsd } from '@/utils/position/getPositionPnlUsd';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { selectIsPnlInLeverage } from '../setting/baseSelectors';
import { PositionsInfo } from '@/selectors/position/types';
import { getBasisPoints } from '@/utils/legacy/common';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';
import { getPositionLiquidationPrice } from '@/utils/position/getPositionLiquidationPrice';
import { getTradeMaxLeverage } from '@/utils/tradebox/getTradeMaxLeverage';
import { getPositionPriceImpactUsd } from '@/utils/position/getPositionPriceImpactUsd';
import { getPositionFeeUsd } from '@/utils/position/getPositionFeeUsd';
import { getPositionNetValueUsd } from '@/utils/position/getPositionNetValueUsd';

export const selectPositionsInfo = createAppStoreSelector(
  [selectPositions, selectMarketsInfo, selectTokensData, selectIsPnlInLeverage],
  (positions, marketInfos, tokens, isPnlInLeverage) => {
    const PositionsInfo: PositionsInfo = {};
    for (const key in positions) {
      const position = positions[key];
      if (position.sizeInUsd.isZero()) continue;
      const marketInfo = marketInfos[position.marketTokenAddress.toBase58()];
      const indexToken = marketInfo?.indexToken;
      const pnlToken = position.isLong
        ? marketInfo?.longToken
        : marketInfo?.shortToken;
      const collateralToken = getByKey(
        tokens,
        position.collateralTokenAddress.toBase58()
      );
      const collateralMinPrice = collateralToken?.prices.minPrice ?? BN_ZERO;
      if (marketInfo && indexToken && pnlToken && collateralToken) {
        const collateralUsd = convertTokenAmountToUsd(
          position.collateralAmount,
          collateralToken?.decimals,
          collateralMinPrice
        );
        // pending borrowing fees are negative (accrued negative borrowing fees)
        const pendingBorrowingFeesUsd = getPositionPendingBorrowingFeesUsd(
          marketInfo,
          position
        ).abs();
        // pending funding fees are negative (accrued negative funding fees)
        const pendingFundingFeesUsd = getPositionPendingFundingFeesUsd(
          marketInfo,
          position
        ).abs();
        // pending claimable funding fees are positive (accrued positive funding fees)
        const pendingClaimableFundingFeesUsd =
          getPositionPendingClaimableFundingFeesUsd(marketInfo, position);
        // total pending fees (absolute value) to deduct from collateral
        // pending borrowing fees + pending funding fees
        const totalPendingFeesUsd = getPositionPendingFeesUsd({
          pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
        });
        const remainingCollateralUsd = collateralUsd.sub(totalPendingFeesUsd);
        const remainingCollateralAmount =
          convertUsdToTokenAmount(
            remainingCollateralUsd,
            collateralToken.decimals,
            collateralMinPrice
          ) ?? BN_ZERO;
        const markPrice = getMarketMarkPrice({
          prices: marketInfo.indexToken.prices,
          isLong: position.isLong,
          isIncrease: false,
        });
        const entryPrice = getPositionEntryPrice({
          sizeInTokens: position.sizeInTokens,
          sizeInUsd: position.sizeInUsd,
          indexToken: marketInfo.indexToken,
        });
        const pnl = getPositionPnlUsd({
          marketInfo: marketInfo,
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          markPrice,
          isLong: position.isLong,
        });
        const pnlPercentage =
          collateralUsd && !collateralUsd.isZero()
            ? getBasisPoints(pnl, collateralUsd)
            : 0;
        const leverage = getPositionLeverage({
          sizeInUsd: position.sizeInUsd,
          collateralUsd: collateralUsd,
          pnl: isPnlInLeverage ? pnl : undefined,
          pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
        });
        const leverageWithPnl = getPositionLeverage({
          sizeInUsd: position.sizeInUsd,
          collateralUsd: collateralUsd,
          pnl: pnl,
          pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
        });
        const openInterest = position.isLong
          ? marketInfo.openInterestForLongLongTokenAmount.add(
              marketInfo.openInterestForLongShortTokenAmount
            )
          : marketInfo.openInterestForShortLongTokenAmount.add(
              marketInfo.openInterestForShortShortTokenAmount
            );
        const maxLeverage = getTradeMaxLeverage(
          marketInfo.minCollateralFactor,
          position.isLong
            ? marketInfo.minCollateralFactorForOpenInterestMultiplierForLong
            : marketInfo.minCollateralFactorForOpenInterestMultiplierForShort,
          openInterest
        );
        const maxAllowedLeverage = maxLeverage.div(BN_TWO);
        const hasLowCollateral =
          leverage !== undefined && leverage.gt(maxAllowedLeverage)
            ? true
            : false;
        
        const liquidationPrice = getPositionLiquidationPrice({
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          collateralAmount: position.collateralAmount,
          collateralUsd: collateralUsd,
          collateralToken,
          marketInfo: marketInfo,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
          pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
          minCollateralUsd: ONE_USD,
          isLong: position.isLong,
        });
        const closingPriceImpactDeltaUsd = getPositionPriceImpactUsd(
          marketInfo,
          position.sizeInUsd.neg(),
          position.isLong,
          { fallbackToZero: true }
        );
        const positionFeeUsd = getPositionFeeUsd(
          marketInfo,
          position.sizeInUsd,
          closingPriceImpactDeltaUsd.gt(BN_ZERO)
        );
        const closingFeeUsd = positionFeeUsd;
        const netValue = getPositionNetValueUsd({
          collateralUsd: collateralUsd ?? BN_ZERO,
          pnl,
          pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
          pendingFundingFeesUsd: pendingFundingFeesUsd,
          closingFeeUsd: closingFeeUsd,
        });
        const pnlAfterFees = pnl.sub(totalPendingFeesUsd).sub(closingFeeUsd);
        const pnlAfterFeesPercentage =
          collateralUsd && !collateralUsd.isZero()
            ? getBasisPoints(pnlAfterFees, collateralUsd.add(closingFeeUsd))
            : 0;
        PositionsInfo[key] = {
          ...position,
          marketInfo: marketInfo,
          indexToken,
          pnlToken,
          collateralToken,
          collateralUsd,
          remainingCollateralUsd,
          remainingCollateralAmount,
          hasLowCollateral,
          markPrice,
          entryPrice,
          liquidationPrice,
          netValue,
          leverage,
          leverageWithPnl,
          pnl,
          pnlPercentage,
          pnlAfterFees,
          pnlAfterFeesPercentage,
          closingFeeUsd,
          pendingFundingFeesUsd,
          pendingBorrowingFeesUsd,
          pendingClaimableFundingFeesUsd,
        };
      }
    }

    return PositionsInfo;
  }
);
