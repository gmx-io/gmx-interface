import { MarketInfo } from '@/selectors/market/types';
import { PositionInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { NextPositionValues } from '@/selectors/trade/types';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance/lib/tools/numbers';
import { getPositionEntryPrice } from './getPositionEntryPrice';
import { getPositionPnlUsd } from './getPositionPnlUsd';
import { getPositionLeverage } from './getPositionLeverage';
import { getPositionLiquidationPrice } from './getPositionLiquidationPrice';

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken?: TokenData;
  sizeDeltaUsd: BN;
  sizeDeltaInTokens: BN;
  collateralDeltaUsd: BN;
  collateralDeltaAmount: BN;
  indexPrice: BN;
  isLong: boolean;
  showPnlInLeverage: boolean;
  minCollateralUsd: BN;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    indexPrice,
    isLong,
    showPnlInLeverage,
    minCollateralUsd,
  } = p;

  if (!collateralToken) {
    return {
      nextSizeUsd: BN_ZERO,
      nextCollateralUsd: BN_ZERO,
      nextEntryPrice: BN_ZERO,
      nextLeverage: BN_ZERO,
      nextLiqPrice: BN_ZERO,
    };
  }

  const nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd.add(collateralDeltaUsd)
    : collateralDeltaUsd;

  const nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount.add(collateralDeltaAmount)
    : collateralDeltaAmount;

  const nextSizeUsd = existingPosition
    ? existingPosition.sizeInUsd.add(sizeDeltaUsd)
    : sizeDeltaUsd;
  const nextSizeInTokens = existingPosition
    ? existingPosition.sizeInTokens.add(sizeDeltaInTokens)
    : sizeDeltaInTokens;

  const nextEntryPrice =
    getPositionEntryPrice({
      sizeInUsd: nextSizeUsd,
      sizeInTokens: nextSizeInTokens,
      indexToken: marketInfo.indexToken,
    }) ?? indexPrice;

  const nextPnl = existingPosition
    ? getPositionPnlUsd({
        marketInfo,
        sizeInUsd: nextSizeUsd,
        sizeInTokens: nextSizeInTokens,
        markPrice: indexPrice,
        isLong,
      })
    : undefined;

  const nextLeverage = getPositionLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: BN_ZERO, // deducted on order
    pendingFundingFeesUsd: BN_ZERO, // deducted on order
  });

  const nextLiqPrice = getPositionLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInUsd: nextSizeUsd,
    sizeInTokens: nextSizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    minCollateralUsd,
    pendingBorrowingFeesUsd: BN_ZERO, // deducted on order
    pendingFundingFeesUsd: BN_ZERO, // deducted on order
    isLong: isLong,
  });

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextEntryPrice,
    nextLeverage,
    nextLiqPrice,
  };
}
