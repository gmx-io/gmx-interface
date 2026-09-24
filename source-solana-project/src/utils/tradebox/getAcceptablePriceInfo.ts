import { BN_ONE, BN_ZERO, ONE_BPS } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getPriceImpactByAcceptablePrice } from '@/utils/fee/getPriceImpactByAcceptablePrice';
import { getPriceImpactForPositionCapped } from '@/utils/fee/getPriceImpactForPositionCapped';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import {
  expandDecimals,
  roundUpMagnitudeDivision,
} from '@/utils/legacy/decimals';
import { applyFactor } from '@/utils/legacy/factor';
import { getAcceptablePriceByPriceImpact } from '@/utils/tradebox/getAcceptablePriceByPriceImpact';
import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function getAcceptablePriceInfo(p: {
  marketInfo: MarketInfo;
  isIncrease: boolean;
  isLong: boolean;
  indexPrice?: BN;
  sizeDeltaUsd?: BN;
  maxNegativePriceImpactBps?: number;
}) {
  const {
    marketInfo,
    isIncrease,
    isLong,
    indexPrice,
    sizeDeltaUsd,
    maxNegativePriceImpactBps,
  } = p;

  if (!indexPrice || !sizeDeltaUsd) {
    return {
      acceptablePrice: BN_ZERO,
      acceptablePriceDeltaBps: 0,
      priceImpactDeltaAmount: BN_ZERO,
      priceImpactDeltaUsd: BN_ZERO,
      priceImpactDiffUsd: BN_ZERO,
    };
  }

  const { indexToken } = marketInfo;

  const values = {
    acceptablePrice: BN_ZERO,
    acceptablePriceDeltaBps: 0,
    priceImpactDeltaAmount: BN_ZERO,
    priceImpactDeltaUsd: BN_ZERO,
    priceImpactDiffUsd: BN_ZERO,
  };

  if (sizeDeltaUsd.lte(BN_ZERO) || indexPrice.isZero()) {
    return values;
  }

  const shouldFlipPriceImpact = getShouldUseMaxPrice(p.isIncrease, p.isLong);

  // For Limit / Trigger orders
  if (
    maxNegativePriceImpactBps !== undefined &&
    maxNegativePriceImpactBps > 0
  ) {
    let priceDelta = indexPrice
      .mul(toBN(maxNegativePriceImpactBps))
      .div(ONE_BPS);
    priceDelta = shouldFlipPriceImpact ? priceDelta.neg() : priceDelta;

    values.acceptablePrice = indexPrice.sub(priceDelta);
    values.acceptablePriceDeltaBps = maxNegativePriceImpactBps * -1;

    const priceImpact = getPriceImpactByAcceptablePrice({
      sizeDeltaUsd,
      acceptablePrice: values.acceptablePrice,
      indexPrice,
      isLong,
      isIncrease,
    });

    values.priceImpactDeltaUsd = priceImpact.priceImpactDeltaUsd;
    values.priceImpactDeltaAmount = priceImpact.priceImpactDeltaAmount;

    return values;
  }

  values.priceImpactDeltaUsd = getPriceImpactForPositionCapped(
    marketInfo,
    isIncrease ? sizeDeltaUsd : sizeDeltaUsd.neg(),
    isLong,
    {
      fallbackToZero: !isIncrease,
    }
  );

  if (!isIncrease && values.priceImpactDeltaUsd.lt(BN_ZERO)) {
    const minPriceImpactUsd = applyFactor(
      sizeDeltaUsd,
      marketInfo.maxNegativePositionImpactFactor
    ).neg();

    if (values.priceImpactDeltaUsd.lt(minPriceImpactUsd)) {
      values.priceImpactDiffUsd = minPriceImpactUsd.sub(
        values.priceImpactDeltaUsd
      );
      values.priceImpactDeltaUsd = minPriceImpactUsd;
    }
  }

  if (values.priceImpactDeltaUsd.gt(BN_ZERO)) {
    values.priceImpactDeltaAmount =
      convertUsdToTokenAmount(
        values.priceImpactDeltaUsd,
        indexToken.decimals,
        indexToken.prices.maxPrice
      ) ?? BN_ZERO;
  } else {
    values.priceImpactDeltaAmount = roundUpMagnitudeDivision(
      values.priceImpactDeltaUsd.mul(
        expandDecimals(BN_ONE, indexToken.decimals)
      ),
      indexToken.prices.minPrice
    );
  }

  const acceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease,
    isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: values.priceImpactDeltaUsd,
  });

  values.acceptablePrice = acceptablePriceValues.acceptablePrice;
  values.acceptablePriceDeltaBps =
    acceptablePriceValues.acceptablePriceDeltaBps;

  return values;
}

function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}
