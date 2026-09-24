import { BN_ONE, BN_ZERO, ONE_USD } from '@/config/constants';
import { Token, TokensRatio } from '@/selectors/token/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { BN } from '@coral-xyz/anchor';

export function getTokensRatioByAmounts(p: {
  fromToken: Token;
  toToken: Token;
  fromTokenAmount: BN;
  toTokenAmount: BN;
}): TokensRatio {
  const { fromToken, toToken, fromTokenAmount, toTokenAmount } = p;

  const adjustedFromAmount = fromTokenAmount
    .mul(ONE_USD)
    .div(expandDecimals(BN_ONE, fromToken.decimals));
  const adjustedToAmount = toTokenAmount
    .mul(ONE_USD)
    .div(expandDecimals(BN_ONE, toToken.decimals));

  const [smallestToken, largestToken, largestAmount, smallestAmount] =
    adjustedFromAmount.gt(adjustedToAmount)
      ? [fromToken, toToken, adjustedFromAmount, adjustedToAmount]
      : [toToken, fromToken, adjustedToAmount, adjustedFromAmount];

  const ratio = smallestAmount.gt(BN_ZERO)
    ? largestAmount.mul(ONE_USD).div(smallestAmount)
    : BN_ZERO;

  return { ratio, largestToken, smallestToken };
}
