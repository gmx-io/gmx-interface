import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER } from "configs/factors";
import { MarketInfo } from "types/markets";
import { OrderType } from "types/orders";
import { TokenPrices } from "types/tokens";
import { TriggerThresholdType } from "types/trade";

import { bigMath } from "./bigmath";
import { getPriceImpactByAcceptablePrice } from "./fees";
import { getCappedPositionImpactUsd } from "./fees";
import { expandDecimals, getBasisPoints } from "./numbers";
import { roundUpMagnitudeDivision } from "./numbers";
import { convertToTokenAmount } from "./tokens";

export function getMarkPrice(p: { prices: TokenPrices; isIncrease: boolean; isLong: boolean }) {
  const { prices, isIncrease, isLong } = p;

  const shouldUseMaxPrice = getShouldUseMaxPrice(isIncrease, isLong);

  return shouldUseMaxPrice ? prices.maxPrice : prices.minPrice;
}

export function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}

export function getOrderThresholdType(orderType: OrderType, isLong: boolean) {
  // limit increase order
  if (orderType === OrderType.LimitIncrease) {
    return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
  }

  // stop market order
  if (orderType === OrderType.StopIncrease) {
    return isLong ? TriggerThresholdType.Above : TriggerThresholdType.Below;
  }

  // take profit order
  if (orderType === OrderType.LimitDecrease) {
    return isLong ? TriggerThresholdType.Above : TriggerThresholdType.Below;
  }

  // stop loss order
  if (orderType === OrderType.StopLossDecrease) {
    return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
  }

  return undefined;
}

export function getAcceptablePriceInfo(p: {
  marketInfo: MarketInfo;
  isIncrease: boolean;
  isLimit: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  maxNegativePriceImpactBps?: bigint;
}) {
  const { marketInfo, isIncrease, isLong, isLimit, indexPrice, sizeDeltaUsd, maxNegativePriceImpactBps } = p;
  const { indexToken } = marketInfo;

  const values = {
    acceptablePrice: 0n,
    acceptablePriceDeltaBps: 0n,
    cappedPriceImpactDeltaUsd: 0n,
    cappedPriceImpactDeltaAmount: 0n,
    priceImpactDeltaAmount: 0n,
    priceImpactDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
    balanceWasImproved: false,
  };

  if (sizeDeltaUsd <= 0 || indexPrice == 0n) {
    return values;
  }

  const shouldFlipPriceImpact = getShouldUseMaxPrice(p.isIncrease, p.isLong);

  // For Limit / Trigger orders
  if (maxNegativePriceImpactBps !== undefined && maxNegativePriceImpactBps > 0) {
    let priceDelta = bigMath.mulDiv(indexPrice, maxNegativePriceImpactBps, BASIS_POINTS_DIVISOR_BIGINT);
    priceDelta = shouldFlipPriceImpact ? priceDelta * -1n : priceDelta;

    values.acceptablePrice = indexPrice - priceDelta;
    values.acceptablePriceDeltaBps = maxNegativePriceImpactBps * -1n;

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

  const { priceImpactDeltaUsd, balanceWasImproved } = getCappedPositionImpactUsd(
    marketInfo,
    sizeDeltaUsd,
    isLong,
    isIncrease,
    {
      fallbackToZero: !isIncrease,
      shouldCapNegativeImpact: isIncrease && !isLimit,
    }
  );

  /**
   * We display this value as price impact on action (increase or decrease)
   * But for acceptable price calculation uncapped price impact is used
   * Also on decrease action we calculate totalImpactUsd which will be deducted from the collateral
   */
  values.priceImpactDeltaUsd = priceImpactDeltaUsd;
  values.balanceWasImproved = balanceWasImproved;

  if (values.priceImpactDeltaUsd > 0) {
    values.priceImpactDeltaAmount = convertToTokenAmount(
      values.priceImpactDeltaUsd,
      indexToken.decimals,
      indexToken.prices.maxPrice
    )!;
  } else {
    values.priceImpactDeltaAmount = roundUpMagnitudeDivision(
      values.priceImpactDeltaUsd * expandDecimals(1, indexToken.decimals),
      indexToken.prices.minPrice
    );
  }

  // Use uncapped price impact for the acceptable price calculation
  const { priceImpactDeltaUsd: priceImpactDeltaUsdForAcceptablePrice } = getCappedPositionImpactUsd(
    marketInfo,
    sizeDeltaUsd,
    isLong,
    isIncrease,
    {
      fallbackToZero: !isIncrease,
      shouldCapNegativeImpact: false,
    }
  );

  const acceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease,
    isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: priceImpactDeltaUsdForAcceptablePrice,
  });

  values.acceptablePrice = acceptablePriceValues.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceValues.acceptablePriceDeltaBps;

  return values;
}

export function getAcceptablePriceByPriceImpact(p: {
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  priceImpactDeltaUsd: bigint;
}) {
  const { indexPrice, sizeDeltaUsd, priceImpactDeltaUsd } = p;

  if (sizeDeltaUsd <= 0 || indexPrice == 0n) {
    return {
      acceptablePrice: indexPrice,
      acceptablePriceDeltaBps: 0n,
      priceDelta: 0n,
    };
  }

  const shouldFlipPriceImpact = getShouldUseMaxPrice(p.isIncrease, p.isLong);

  const priceImpactForPriceAdjustment = shouldFlipPriceImpact ? priceImpactDeltaUsd * -1n : priceImpactDeltaUsd;
  const acceptablePrice = bigMath.mulDiv(indexPrice, sizeDeltaUsd + priceImpactForPriceAdjustment, sizeDeltaUsd);

  const priceDelta = (indexPrice - acceptablePrice) * (shouldFlipPriceImpact ? 1n : -1n);
  const acceptablePriceDeltaBps = getBasisPoints(priceDelta, p.indexPrice);

  return {
    acceptablePrice,
    acceptablePriceDeltaBps,
    priceDelta,
  };
}

export function getDefaultAcceptablePriceImpactBps(p: {
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  priceImpactDeltaUsd: bigint;
  acceptablePriceImapctBuffer?: number;
}) {
  const {
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
    acceptablePriceImapctBuffer = DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER,
  } = p;

  if (priceImpactDeltaUsd > 0) {
    return BigInt(acceptablePriceImapctBuffer);
  }

  const baseAcceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease: p.isIncrease,
    isLong: p.isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
  });

  if (baseAcceptablePriceValues.acceptablePriceDeltaBps < 0) {
    return bigMath.abs(baseAcceptablePriceValues.acceptablePriceDeltaBps) + BigInt(acceptablePriceImapctBuffer);
  }

  return BigInt(acceptablePriceImapctBuffer);
}
