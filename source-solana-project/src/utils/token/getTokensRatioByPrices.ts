import { ONE_USD } from '@/config/constants';
import { TokenData, TokensRatio } from '@/selectors/token/types';
import { BN } from '@coral-xyz/anchor';

export function getTokensRatioByPrices(p: {
  fromToken: TokenData;
  toToken: TokenData;
  fromPrice: BN;
  toPrice: BN;
}): TokensRatio {
  const { fromToken, toToken, fromPrice, toPrice } = p;

  const [largestToken, smallestToken, largestPrice, smallestPrice] =
    fromPrice.gt(toPrice)
      ? [fromToken, toToken, fromPrice, toPrice]
      : [toToken, fromToken, toPrice, fromPrice];

  const ratio = largestPrice.mul(ONE_USD).div(smallestPrice);

  return { ratio, largestToken, smallestToken };
}
