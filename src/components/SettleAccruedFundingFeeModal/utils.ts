import { PositionInfo } from "domain/synthetics/positions";

const PENDING_FUNDING_FEE_THRESHOLD = 10n * 10n ** 30n; // 10$
const SETTLE_FEE_RATIO_THRESHOLD = 10n;

export function getIsSettlementLikelyToFail({ remainingCollateralUsd }: PositionInfo) {
  return remainingCollateralUsd < 0n;
}

export function shouldPreSelectPosition(position: PositionInfo, networkFee: bigint) {
  const { pendingClaimableFundingFeesUsd, marketInfo } = position;

  return (
    !marketInfo?.isDisabled &&
    !getIsSettlementLikelyToFail(position) &&
    pendingClaimableFundingFeesUsd > PENDING_FUNDING_FEE_THRESHOLD &&
    pendingClaimableFundingFeesUsd > networkFee * SETTLE_FEE_RATIO_THRESHOLD
  );
}
