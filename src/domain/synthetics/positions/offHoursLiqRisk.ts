import { getOffHoursMarketInfo } from "domain/synthetics/markets/offHoursLiquidationRisk";
import { bigMath } from "sdk/utils/bigmath";
import type { MarketInfo } from "sdk/utils/markets/types";
import { applyFactor } from "sdk/utils/numbers";
import type { UserReferralInfo } from "sdk/utils/referrals/types";

import type { PositionInfo } from "./types";
import { getEstimatedLiquidationTimeInHours, getLiquidationPrice } from "./utils";

const SOFT_LIQUIDATION_HOURS = 24 * 7;

function isRiskyUnderOffHours(
  offHoursMarketInfo: MarketInfo,
  positionLike: PositionInfo,
  minCollateralUsd: bigint
): boolean {
  const offHours = getEstimatedLiquidationTimeInHours(
    { ...positionLike, marketInfo: offHoursMarketInfo },
    minCollateralUsd
  );

  if (offHours !== undefined && offHours < SOFT_LIQUIDATION_HOURS) return true;

  const liquidationCollateralUsd = bigMath.max(
    applyFactor(positionLike.sizeInUsd, offHoursMarketInfo.minCollateralFactor),
    minCollateralUsd
  );

  return positionLike.netValue <= liquidationCollateralUsd;
}

export function getPositionOffHoursLiqRisk(p: {
  chainId: number;
  position: PositionInfo;
  minCollateralUsd: bigint | undefined;
  userReferralInfo: UserReferralInfo | undefined;
}): { showWarning: boolean; offHoursLiqPrice: bigint | undefined } {
  const { chainId, position, minCollateralUsd, userReferralInfo } = p;
  const offHoursMarketInfo = getOffHoursMarketInfo(chainId, position.marketInfo);

  if (!offHoursMarketInfo || minCollateralUsd === undefined || !position.marketInfo) {
    return { showWarning: false, offHoursLiqPrice: undefined };
  }

  if (!isRiskyUnderOffHours(offHoursMarketInfo, position, minCollateralUsd)) {
    return { showWarning: false, offHoursLiqPrice: undefined };
  }

  const offHoursLiqPrice = getLiquidationPrice({
    marketInfo: offHoursMarketInfo,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    collateralAmount: position.collateralAmount,
    collateralUsd: position.collateralUsd,
    collateralToken: position.collateralToken,
    minCollateralUsd,
    pendingFundingFeesUsd: position.pendingFundingFeesUsd,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingImpactAmount: position.pendingImpactAmount,
    isLong: position.isLong,
    userReferralInfo,
  });

  return { showWarning: true, offHoursLiqPrice };
}

export function isTradeboxOffHoursLiqRisk(p: {
  chainId: number;
  marketInfo: MarketInfo | undefined;
  isLong: boolean;
  nextSizeInUsd: bigint | undefined;
  nextCollateralUsd: bigint | undefined;
  minCollateralUsd: bigint | undefined;
}): boolean {
  const { chainId, marketInfo, isLong, nextSizeInUsd, nextCollateralUsd, minCollateralUsd } = p;
  const offHoursMarketInfo = getOffHoursMarketInfo(chainId, marketInfo);

  if (
    !marketInfo ||
    !offHoursMarketInfo ||
    minCollateralUsd === undefined ||
    nextSizeInUsd === undefined ||
    nextSizeInUsd <= 0n ||
    nextCollateralUsd === undefined
  ) {
    return false;
  }

  const resultingPosition = {
    marketInfo,
    isLong,
    sizeInUsd: nextSizeInUsd,
    isOpening: false,
    netValue: nextCollateralUsd,
    pendingImpactAmount: 0n,
  } as PositionInfo;

  return isRiskyUnderOffHours(offHoursMarketInfo, resultingPosition, minCollateralUsd);
}
