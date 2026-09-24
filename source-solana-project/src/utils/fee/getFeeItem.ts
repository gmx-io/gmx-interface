import { BN_ZERO } from '@/config/constants';
import { FeeItem } from '@/selectors/fee/types';
import { getBasisPoints } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

export function getFeeItem(
  feeDeltaUsd?: BN,
  basis?: BN,
  opts: { shouldRoundUp?: boolean } = {}
): FeeItem | undefined {
  const { shouldRoundUp = false } = opts;
  if (feeDeltaUsd === undefined) return undefined;

  return {
    deltaUsd: feeDeltaUsd,
    bps:
      basis !== undefined && basis.gt(BN_ZERO)
        ? getBasisPoints(feeDeltaUsd, basis, shouldRoundUp)
        : 0,
  };
}
