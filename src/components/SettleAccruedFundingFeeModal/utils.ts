import {
  PositionInfo,
  getIsPositionBelowMinCollateralForLeverage,
  getIsPositionInfoLoaded,
} from "domain/synthetics/positions";

const PENDING_FUNDING_FEE_THRESHOLD = 10n * 10n ** 30n; // 10$
const SETTLE_FEE_RATIO_THRESHOLD = 10n;

export const SETTLEMENT_COLLATERAL_DELTA_AMOUNT = 1n;

export type SettlementBlockReason = "negativeMargin" | "belowMinCollateral";

export function getSettlementBlockReason(position: PositionInfo): SettlementBlockReason | undefined {
  if (position.remainingCollateralUsd < 0n) {
    return "negativeMargin";
  }

  if (
    getIsPositionInfoLoaded(position) &&
    getIsPositionBelowMinCollateralForLeverage(position, SETTLEMENT_COLLATERAL_DELTA_AMOUNT)
  ) {
    return "belowMinCollateral";
  }

  return undefined;
}

export function getIsPositionSettleable(position: PositionInfo) {
  return !position.marketInfo?.isDisabled && getSettlementBlockReason(position) === undefined;
}

export function shouldPreSelectPosition(position: PositionInfo, networkFee: bigint) {
  const { pendingClaimableFundingFeesUsd } = position;

  return (
    getIsPositionSettleable(position) &&
    pendingClaimableFundingFeesUsd > PENDING_FUNDING_FEE_THRESHOLD &&
    pendingClaimableFundingFeesUsd > networkFee * SETTLE_FEE_RATIO_THRESHOLD
  );
}
