import { BN_ZERO, ONE_USD } from '@/config/constants';
import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { BN } from '@coral-xyz/anchor';

export function getPositionLeverage(p: {
  sizeInUsd: BN;
  collateralUsd: BN;
  pnl?: BN;
  pendingFundingFeesUsd: BN;
  pendingBorrowingFeesUsd: BN;
}): BN | undefined {
  const {
    pnl,
    sizeInUsd,
    collateralUsd,
    pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
  } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
  });

  const remainingCollateralUsd = collateralUsd
    .add(pnl ?? BN_ZERO)
    .sub(totalPendingFeesUsd);

  if (remainingCollateralUsd.lte(BN_ZERO)) {
    return undefined;
  }

  const leverage = sizeInUsd.mul(ONE_USD).div(remainingCollateralUsd);

  return leverage;
}
