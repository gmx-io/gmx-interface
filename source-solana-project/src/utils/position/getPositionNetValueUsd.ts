import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { BN } from '@coral-xyz/anchor';

export function getPositionNetValueUsd(p: {
  collateralUsd: BN;
  pendingFundingFeesUsd: BN;
  pendingBorrowingFeesUsd: BN;
  pnl: BN;
  closingFeeUsd: BN;
}) {
  const { pnl, closingFeeUsd, collateralUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return collateralUsd.sub(pendingFeesUsd).sub(closingFeeUsd).add(pnl);
}
