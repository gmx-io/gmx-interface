import {
  PositionInfo,
  getIsPositionBelowMinCollateralForLeverage,
  getIsPositionInfoLoaded,
} from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";

const PENDING_FUNDING_FEE_THRESHOLD = 10n * 10n ** 30n; // 10$
const SETTLE_FEE_RATIO_THRESHOLD = 10n;

export const SETTLEMENT_COLLATERAL_DELTA_AMOUNT = 1n;

export type SettlementBlockReason = "negativeMargin" | "belowMinCollateral";

export function getSettlementBlockReason(
  position: PositionInfo,
  minCollateralUsd: bigint | undefined
): SettlementBlockReason | undefined {
  if (position.remainingCollateralUsd < 0n) {
    return "negativeMargin";
  }

  if (!getIsPositionInfoLoaded(position)) {
    return undefined;
  }

  if (getIsPositionBelowMinCollateralForLeverage(position, SETTLEMENT_COLLATERAL_DELTA_AMOUNT)) {
    return "belowMinCollateral";
  }

  const collateralUsdAfterSettlement = convertToUsd(
    position.collateralAmount - SETTLEMENT_COLLATERAL_DELTA_AMOUNT,
    position.collateralToken.decimals,
    position.collateralToken.prices.minPrice
  )!;

  if (minCollateralUsd !== undefined && collateralUsdAfterSettlement + position.pnl < minCollateralUsd) {
    return "belowMinCollateral";
  }

  return undefined;
}

export function getIsPositionSettleable(position: PositionInfo, minCollateralUsd: bigint | undefined) {
  return !position.marketInfo?.isDisabled && getSettlementBlockReason(position, minCollateralUsd) === undefined;
}

export function shouldPreSelectPosition(
  position: PositionInfo,
  networkFee: bigint,
  minCollateralUsd: bigint | undefined
) {
  const { pendingClaimableFundingFeesUsd } = position;

  return (
    getIsPositionSettleable(position, minCollateralUsd) &&
    pendingClaimableFundingFeesUsd > PENDING_FUNDING_FEE_THRESHOLD &&
    pendingClaimableFundingFeesUsd > networkFee * SETTLE_FEE_RATIO_THRESHOLD
  );
}
