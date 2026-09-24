import { MarketInfo } from '@/selectors/market/types';
import { Position } from '@/selectors/position/types';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPositionPendingBorrowingFeesUsd(
  marketInfo: MarketInfo,
  position: Position
): BN {
  const diffBorrowingFeeFactor = position.isLong
    ? marketInfo.borrowingFactorLongTokenAmount.sub(position.borrowingFactor)
    : marketInfo.borrowingFactorShortTokenAmount.sub(position.borrowingFactor);

  return applyFactor(position.sizeInUsd, diffBorrowingFeeFactor).neg();
}
