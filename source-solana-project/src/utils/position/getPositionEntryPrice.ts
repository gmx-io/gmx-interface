import { BN_ONE, BN_ZERO } from '@/config/constants';
import { Token } from '@/selectors/token/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { BN } from '@coral-xyz/anchor';

export function getPositionEntryPrice(p: {
  sizeInUsd: BN;
  sizeInTokens: BN;
  indexToken: Token;
}) {
  const { sizeInUsd, sizeInTokens, indexToken } = p;

  if (!sizeInTokens.gt(BN_ZERO)) {
    return undefined;
  }

  return sizeInUsd
    .div(sizeInTokens)
    .mul(expandDecimals(BN_ONE, indexToken.decimals));
}
