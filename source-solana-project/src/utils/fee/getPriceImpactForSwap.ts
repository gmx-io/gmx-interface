import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getPriceImpactUsd } from '@/utils/fee/getPriceImpactUsd';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';
import { getNextPoolAmountsParams } from '@/utils/position/getNextPoolAmountsParams';
import { BN } from '@coral-xyz/anchor';

export function getPriceImpactForSwap(
  marketInfo: MarketInfo,
  tokenA: TokenData,
  tokenB: TokenData,
  usdDeltaTokenA: BN,
  usdDeltaTokenB: BN,
  opts: { fallbackToZero?: boolean } = {}
) {
  const tokenAPoolType = getTokenPoolType(
    marketInfo,
    tokenA.address.toBase58()
  );
  const tokenBPoolType = getTokenPoolType(
    marketInfo,
    tokenB.address.toBase58()
  );

  if (
    tokenAPoolType === undefined ||
    tokenBPoolType === undefined ||
    (tokenAPoolType === tokenBPoolType && !marketInfo.isSingle)
  ) {
    throw new Error(
      `Invalid tokens to swap ${marketInfo.marketTokenAddress.toBase58()} ${tokenA.address.toBase58()} ${tokenB.address.toBase58()}`
    );
  }

  const [longToken, shortToken] =
    tokenAPoolType === 'long' ? [tokenA, tokenB] : [tokenB, tokenA];
  const [longDeltaUsd, shortDeltaUsd] =
    tokenAPoolType === 'long'
      ? [usdDeltaTokenA, usdDeltaTokenB]
      : [usdDeltaTokenB, usdDeltaTokenA];

  const { longPoolUsd, shortPoolUsd, nextLongPoolUsd, nextShortPoolUsd } =
    getNextPoolAmountsParams({
      longToken,
      shortToken,
      longPoolAmount: marketInfo.primaryLongTokenAmount,
      shortPoolAmount: marketInfo.primaryShortTokenAmount,
      longDeltaUsd,
      shortDeltaUsd,
    });

  const priceImpactUsd = getPriceImpactUsd({
    currentLongUsd: longPoolUsd,
    currentShortUsd: shortPoolUsd,
    nextLongUsd: nextLongPoolUsd,
    nextShortUsd: nextShortPoolUsd,
    factorPositive: marketInfo.swapImpactPositiveFactor,
    factorNegative: marketInfo.swapImpactNegativeFactor,
    exponentFactor: marketInfo.swapImpactExponent,
    fallbackToZero: opts.fallbackToZero,
  });

  return priceImpactUsd;
}
