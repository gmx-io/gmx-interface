import { BN } from '@coral-xyz/anchor';

export function getPositionPendingFeesUsd(p: {
  pendingFundingFeesUsd: BN;
  pendingBorrowingFeesUsd: BN;
}) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  return pendingBorrowingFeesUsd.add(pendingFundingFeesUsd);
}
