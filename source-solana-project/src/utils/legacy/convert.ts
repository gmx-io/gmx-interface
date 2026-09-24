import { BN_ONE, BN_ZERO, ONE_USD } from '@/config/constants';
import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getUnit } from '@/utils/legacy/common';
import { expandDecimals } from '@/utils/legacy/decimals';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { BN } from '@coral-xyz/anchor';

export function convertTokenAmountToUsd(
  tokenAmount?: BN | undefined | null,
  tokenDecimals?: number | undefined,
  price?: BN | undefined
): BN {
  if (!tokenAmount || !tokenDecimals || !price) {
    return BN_ZERO;
  }
  const usdValue = tokenAmount
    .mul(price)
    .div(expandDecimals(BN_ONE, tokenDecimals));
  return usdValue;
}

export function convertUsdToTokenAmount(
  usdValue: BN | undefined,
  tokenDecimals: number | undefined,
  price: BN | undefined
): BN {
  if (!usdValue || !tokenDecimals || !price || price.isZero()) {
    return BN_ZERO;
  }

  const tokenAmount = usdValue
    .mul(expandDecimals(BN_ONE, tokenDecimals))
    .div(price);
  return tokenAmount;
}

export function convertMarketTokenAmountToUsd(
  marketInfo: MarketInfo,
  marketToken: TokenData,
  amount: BN
) {
  if (marketInfo && marketToken) {
    const price = marketToken.prices.minPrice ?? ONE_USD;
    return convertTokenAmountToUsd(amount, marketToken.decimals, price);
  }

  return BN_ZERO;
}

export function convertUsdToMarketTokenAmount(
  marketInfo: MarketInfo,
  marketToken: TokenData,
  usdValue: BN
) {
  if (marketInfo && marketToken) {
    const price = marketToken.prices.maxPrice ?? ONE_USD;
    return convertUsdToTokenAmount(usdValue, marketToken.decimals, price);
  }

  return BN_ZERO;
}

export function convertToFixedDecimal(amount: BN, decimals: number): string {
  const divisor = getUnit(decimals);
  if (divisor.isZero()) {
    return '...';
  }
  const integerPart = amount.div(divisor);
  const decimalPart = amount.mod(divisor).toString(10, decimals);
  return `${integerPart.toString()}.${decimalPart}`;
}

export function convertTokenAddress(
  address: string,
  convertTo?: 'wrapped' | 'native'
) {
  if (convertTo === 'wrapped' && isNativeToken(address)) {
    return WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58();
  }

  if (convertTo === 'native' && isWrappedNativeToken(address)) {
    return NATIVE_TOKEN_ADDRESS.toBase58();
  }

  return address;
}
