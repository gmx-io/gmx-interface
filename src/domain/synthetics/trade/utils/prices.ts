import {
  BASIS_POINTS_DIVISOR,
  BASIS_POINTS_DIVISOR_BIGINT,
  DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
} from "config/factors";
import { getCappedPositionImpactUsd, getPriceImpactByAcceptablePrice } from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { TokenPrices, convertToTokenAmount } from "domain/synthetics/tokens";
import { applyFactor, expandDecimals, getBasisPoints, roundUpMagnitudeDivision } from "lib/numbers";
import { TriggerThresholdType } from "../types";
import { bigMath } from "lib/bigmath";

export function getMarkPrice(p: { prices: TokenPrices; isIncrease: boolean; isLong: boolean }) {
  const { prices, isIncrease, isLong } = p;

  const shouldUseMaxPrice = getShouldUseMaxPrice(isIncrease, isLong);

  return shouldUseMaxPrice ? prices.maxPrice : prices.minPrice;
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
    acceptablePriceImapctBuffer = DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
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

export function getAcceptablePriceInfo(p: {
  marketInfo: MarketInfo;
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  maxNegativePriceImpactBps?: bigint;
}) {
  const { marketInfo, isIncrease, isLong, indexPrice, sizeDeltaUsd, maxNegativePriceImpactBps } = p;
  const { indexToken } = marketInfo;

  const values = {
    acceptablePrice: 0n,
    acceptablePriceDeltaBps: 0n,
    priceImpactDeltaAmount: 0n,
    priceImpactDeltaUsd: 0n,
    priceImpactDiffUsd: 0n,
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

  values.priceImpactDeltaUsd = getCappedPositionImpactUsd(
    marketInfo,
    isIncrease ? sizeDeltaUsd : sizeDeltaUsd * -1n,
    isLong,
    {
      fallbackToZero: !isIncrease,
    }
  );

  if (!isIncrease && values.priceImpactDeltaUsd < 0) {
    const minPriceImpactUsd = applyFactor(sizeDeltaUsd, marketInfo.maxPositionImpactFactorNegative) * -1n;

    if (values.priceImpactDeltaUsd < minPriceImpactUsd) {
      values.priceImpactDiffUsd = minPriceImpactUsd - values.priceImpactDeltaUsd;
      values.priceImpactDeltaUsd = minPriceImpactUsd;
    }
  }

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

  const acceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease,
    isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd: values.priceImpactDeltaUsd,
  });

  values.acceptablePrice = acceptablePriceValues.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceValues.acceptablePriceDeltaBps;

  return values;
}

export function applySlippageToPrice(allowedSlippage: number, price: bigint, isIncrease: boolean, isLong: boolean) {
  const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

  const slippageBasisPoints = shouldIncreasePrice
    ? BASIS_POINTS_DIVISOR + allowedSlippage
    : BASIS_POINTS_DIVISOR - allowedSlippage;

  return bigMath.mulDiv(price, BigInt(slippageBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
}

export function applySlippageToMinOut(allowedSlippage: number, minOutputAmount: bigint) {
  const slippageBasisPoints = BASIS_POINTS_DIVISOR - allowedSlippage;

  return bigMath.mulDiv(minOutputAmount, BigInt(slippageBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
}

export function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
  return isIncrease ? isLong : !isLong;
}

export function getTriggerThresholdType(orderType: OrderType, isLong: boolean) {
  // limit order
  if (orderType === OrderType.LimitIncrease) {
    return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
  }

  // take profit order
  if (orderType === OrderType.LimitDecrease) {
    return isLong ? TriggerThresholdType.Above : TriggerThresholdType.Below;
  }

  // stop loss order
  if (orderType === OrderType.StopLossDecrease) {
    return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
  }

  throw new Error("Invalid trigger order type");
}

export function getTriggerDecreaseOrderType(p: {
  triggerPrice: bigint;
  markPrice: bigint;
  isLong: boolean;
}): OrderType.LimitDecrease | OrderType.StopLossDecrease {
  const { triggerPrice, markPrice, isLong } = p;

  const isTriggerAboveMarkPrice = triggerPrice > markPrice;

  if (isTriggerAboveMarkPrice) {
    return isLong ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  } else {
    return isLong ? OrderType.StopLossDecrease : OrderType.LimitDecrease;
  }
}
