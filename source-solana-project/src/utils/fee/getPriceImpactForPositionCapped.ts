import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getPriceImpactForPosition } from '@/utils/fee/getPriceImpactForPosition';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPriceImpactForPositionCapped(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BN,
  isLong: boolean,
  opts: { fallbackToZero?: boolean } = {}
): BN {
  const priceImpactDeltaUsd = getPriceImpactForPosition(
    marketInfo,
    sizeDeltaUsd,
    isLong,
    opts
  );

  if (priceImpactDeltaUsd.lt(BN_ZERO)) {
    return priceImpactDeltaUsd;
  }

  const { indexToken } = marketInfo;

  const impactPoolAmount = marketInfo.positionImpactLongTokenAmount.add(
    marketInfo.positionImpactShortTokenAmount
  );

  const maxPriceImpactUsdBasedOnImpactPool = convertTokenAmountToUsd(
    impactPoolAmount,
    indexToken.decimals,
    indexToken.prices.minPrice
  );

  let cappedImpactUsd = priceImpactDeltaUsd;

  if (cappedImpactUsd.gt(maxPriceImpactUsdBasedOnImpactPool)) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnImpactPool;
  }

  const maxPriceImpactFactor = marketInfo.maxPositivePositionImpactFactor;
  const maxPriceImpactUsdBasedOnMaxPriceImpactFactor = applyFactor(
    sizeDeltaUsd.abs(),
    maxPriceImpactFactor
  );

  if (cappedImpactUsd.gt(maxPriceImpactUsdBasedOnMaxPriceImpactFactor)) {
    cappedImpactUsd = maxPriceImpactUsdBasedOnMaxPriceImpactFactor;
  }

  return cappedImpactUsd;
}
