import { ONE_USD, USD_DECIMALS } from '@/config/constants';
import { TokenData } from '@/selectors/token/types';
import { getPriceDecimals } from '@/utils/legacy/common';
import { formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';

export function getOrderExchangeRateDisplay(
  rate: BN | undefined,
  tokenA: TokenData | undefined,
  tokenB: TokenData | undefined,
  opts: { omitSymbols?: boolean } = {}
) {
  if (!rate || rate.isZero() || !tokenA || !tokenB) return '...';
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA];
    rate = ONE_USD.mul(ONE_USD).div(rate);
  }
  const rateDecimals = getPriceDecimals(rate);
  const rateValue = formatAmount(rate, USD_DECIMALS, rateDecimals, true);
  if (opts.omitSymbols) {
    return rateValue;
  }
  return `${rateValue} ${tokenA.symbol} / ${tokenB.symbol}`;
}

function shouldInvertTriggerRatio(tokenA: TokenData, tokenB: TokenData) {
  // if ((tokenB.isStable || tokenB.isUsdg) && !tokenA.isStable) return true;
  if ((tokenB.isStable || tokenB.isStable) && !tokenA.isStable) return true;
  if (
    tokenB.prices.maxPrice &&
    tokenA.prices.maxPrice &&
    tokenB.prices.maxPrice.lt(tokenA.prices.maxPrice)
  )
    return true;
  return false;
}
