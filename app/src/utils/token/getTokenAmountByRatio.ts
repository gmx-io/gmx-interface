import { BN_ONE, BN_ZERO, ONE_USD } from '@/config/constants';
import { Token } from '@/selectors/token/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { BN } from '@coral-xyz/anchor';

export function getTokenAmountByRatio(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BN;
  ratio: BN;
  shouldInvertRatio?: boolean;
}): BN {
  const { fromToken, toToken, fromTokenAmount, ratio, shouldInvertRatio } = p;

  if (
    getIsEquivalentTokens(fromToken, toToken) ||
    fromTokenAmount.eq(BN_ZERO)
  ) {
    return fromTokenAmount;
  }

  const _ratio = shouldInvertRatio ? ONE_USD.mul(ONE_USD).div(ratio) : ratio;

  const adjustedDecimalsRatio = adjustForDecimals(
    _ratio,
    fromToken.decimals,
    toToken.decimals
  );

  return fromTokenAmount.mul(adjustedDecimalsRatio).div(ONE_USD);
}

function adjustForDecimals(
  amount: BN,
  divDecimals: number,
  mulDecimals: number
): BN {
  return amount
    .mul(expandDecimals(BN_ONE, mulDecimals))
    .div(expandDecimals(BN_ONE, divDecimals));
}
