import { BN } from '@coral-xyz/anchor';

import { GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { TokenPrices } from '@/selectors/token/types';
import { getPriceDecimals } from '@/utils/legacy/common';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';

const FOREX_PRICE_DECIMALS = 5;

function toPositiveBN(price?: BN | string | number | null): BN | undefined {
  if (price === undefined || price === null || price === '') {
    return undefined;
  }

  try {
    const priceBn = price instanceof BN ? price : new BN(price);
    return priceBn.gt(new BN(0)) ? priceBn : undefined;
  } catch {
    return undefined;
  }
}

export function getMarketPriceInputDecimals(
  price?: BN | string | number | null,
  indexTokenAddress?: string
): number | undefined {
  const priceBn = toPositiveBN(price);
  if (!priceBn) {
    return undefined;
  }

  if (
    indexTokenAddress &&
    GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexTokenAddress)
  ) {
    return FOREX_PRICE_DECIMALS;
  }

  return getPriceDecimals(priceBn);
}

export function getMarketPriceInputDecimalsFromPrices(
  prices?: TokenPrices | null,
  indexTokenAddress?: string
): number | undefined {
  if (!prices?.minPrice || !prices?.maxPrice) {
    return undefined;
  }

  return getMarketPriceInputDecimals(
    getMarketMidPrice(prices),
    indexTokenAddress
  );
}
