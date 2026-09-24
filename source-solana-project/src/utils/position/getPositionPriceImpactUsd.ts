import { MarketInfo } from '@/selectors/market/types';
import { getPriceImpactUsd } from '@/utils/fee/getPriceImpactUsd';
import { getNextOpenInterestParams } from '@/utils/position/getNextOpenInterestParams';
import { BN } from '@coral-xyz/anchor';

export function getPositionPriceImpactUsd(
  marketInfo: MarketInfo,
  sizeDeltaUsd: BN,
  isLong: boolean,
  opts: { fallbackToZero?: boolean } = {}
) {
  const longInterestUsd = marketInfo.openInterestForLongLongTokenAmount.add(
    marketInfo.openInterestForLongShortTokenAmount
  );
  const shortInterestUsd = marketInfo.openInterestForShortLongTokenAmount.add(
    marketInfo.openInterestForShortShortTokenAmount
  );

  const { currentLongUsd, currentShortUsd, nextLongUsd, nextShortUsd } =
    getNextOpenInterestParams({
      currentLongUsd: longInterestUsd,
      currentShortUsd: shortInterestUsd,
      usdDelta: sizeDeltaUsd,
      isLong: isLong,
    });

  const priceImpactUsd = getPriceImpactUsd({
    currentLongUsd,
    currentShortUsd,
    nextLongUsd,
    nextShortUsd,
    factorPositive: marketInfo.positionImpactPositiveFactor,
    factorNegative: marketInfo.positionImpactNegativeFactor,
    exponentFactor: marketInfo.positionImpactExponent,
    fallbackToZero: opts.fallbackToZero,
  });

  return priceImpactUsd;
}
