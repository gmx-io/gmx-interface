import { BN_10, BN_ONE, BN_ZERO } from '@/config/constants';
import { expandDecimals } from '@/utils/legacy/decimals';

export function getMinResidualAmount(nativeTokenDecimals?: number) {
  if (!nativeTokenDecimals) {
    return BN_ZERO;
  }

  const getMinResidualAmount = expandDecimals(BN_ONE, nativeTokenDecimals).div(
    BN_10
  ); // 0.1 SOL
  return getMinResidualAmount;
}
