import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { PositionInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { NextPositionValues } from '@/selectors/trade/types';
import { getBasisPoints } from '@/utils/legacy/common';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';
import { getPositionLiquidationPrice } from '@/utils/position/getPositionLiquidationPrice';
import { BN } from '@coral-xyz/anchor';

export function getNextPositionValuesForDecreaseTrade(p: {
  existingPosition?: PositionInfo;
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  sizeDeltaUsd: BN;
  sizeDeltaInTokens: BN;
  realizedPnl: BN;
  estimatedPnl: BN;
  collateralDeltaUsd: BN;
  collateralDeltaAmount: BN;
  payedRemainingCollateralUsd: BN;
  payedRemainingCollateralAmount: BN;
  showPnlInLeverage: boolean;
  isLong: boolean;
  minCollateralUsd: BN;
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    realizedPnl,
    estimatedPnl,
    collateralDeltaUsd,
    collateralDeltaAmount,
    payedRemainingCollateralUsd,
    payedRemainingCollateralAmount,
    showPnlInLeverage,
    isLong,
    minCollateralUsd,
  } = p;

  const nextSizeUsd = existingPosition
    ? existingPosition.sizeInUsd.sub(sizeDeltaUsd)
    : BN_ZERO;
  const nextSizeInTokens = existingPosition
    ? existingPosition.sizeInTokens.sub(sizeDeltaInTokens)
    : BN_ZERO;

  let nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd
        .sub(collateralDeltaUsd)
        .sub(payedRemainingCollateralUsd)
    : BN_ZERO;

  if (nextCollateralUsd.lt(BN_ZERO)) {
    nextCollateralUsd = BN_ZERO;
  }

  let nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount
        .sub(collateralDeltaAmount)
        .sub(payedRemainingCollateralAmount)
    : BN_ZERO;

  if (nextCollateralAmount.lt(BN_ZERO)) {
    nextCollateralAmount = BN_ZERO;
  }

  const nextPnl = estimatedPnl ? estimatedPnl.sub(realizedPnl) : BN_ZERO;

  const nextPnlPercentage = nextCollateralUsd.gt(BN_ZERO)
    ? getBasisPoints(nextPnl, nextCollateralUsd)
    : 0;

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
    sizeInTokens: nextSizeInTokens,
    sizeInUsd: nextSizeUsd,
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
    nextLiqPrice,
    nextPnl,
    nextPnlPercentage,
    nextLeverage,
  };
}
