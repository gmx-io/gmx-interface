import { BASIS_POINTS_DIVISOR_BIGINT, DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER } from "configs/factors";
import { bigMath } from "utils/bigmath";
import {
  capPositionImpactUsdByMaxPriceImpactFactor,
  getCappedPositionImpactUsd,
  getPriceImpactByAcceptablePrice,
} from "utils/fees";
import { getGmsolIncreaseSizeDeltaInTokens, getGmsolUsdAmount, GMSOL_PRECISION_SCALE } from "utils/gmsol";
import { MarketInfo } from "utils/markets/types";
import { expandDecimals, getBasisPoints, roundUpMagnitudeDivision } from "utils/numbers";
import { OrderType } from "utils/orders/types";
import { convertToTokenAmount } from "utils/tokens";
import { TokenPrices } from "utils/tokens/types";
import { TriggerThresholdType } from "utils/trade/types";

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

export function getIsIncreaseOrderExecutableNow(p: {
  orderType: OrderType | undefined;
  isLong: boolean;
  triggerPrice: bigint | undefined;
  indexTokenPrices: TokenPrices;
}): boolean {
  const { orderType, isLong, triggerPrice, indexTokenPrices } = p;

  if (orderType === OrderType.MarketIncrease) {
    return true;
  }

  if (triggerPrice === undefined || triggerPrice <= 0n) {
    return false;
  }

  if (orderType === OrderType.LimitIncrease) {
    return isLong ? indexTokenPrices.maxPrice <= triggerPrice : indexTokenPrices.minPrice >= triggerPrice;
  }

  if (orderType === OrderType.StopIncrease) {
    return isLong ? indexTokenPrices.maxPrice >= triggerPrice : indexTokenPrices.minPrice <= triggerPrice;
  }

  return false;
}

export function getIncreaseEvaluationIndexPrice(p: {
  orderType: OrderType | undefined;
  triggerPrice: bigint | undefined;
}): bigint | undefined {
  if (
    p.triggerPrice === undefined ||
    p.triggerPrice <= 0n ||
    p.orderType === undefined ||
    p.orderType === OrderType.MarketIncrease
  ) {
    return undefined;
  }

  return p.triggerPrice;
}

type AcceptablePriceParams = {
  marketInfo: MarketInfo;
  isIncrease: boolean;
  isLimit: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  maxNegativePriceImpactBps?: bigint;
  sizeDeltaInTokens?: bigint;
  positionSizeInUsd?: bigint;
  positionSizeInTokens?: bigint;
};

export function getAcceptablePriceInfo(p: AcceptablePriceParams) {
  const { isIncrease, isLong, indexPrice, sizeDeltaUsd, maxNegativePriceImpactBps } = p;
  const marketInfo =
    p.marketInfo.tradeMath === "gmsol" && p.isLimit
      ? {
          ...p.marketInfo,
          indexToken: { ...p.marketInfo.indexToken, prices: { minPrice: indexPrice, maxPrice: indexPrice } },
        }
      : p.marketInfo;
  const { indexToken } = marketInfo;

  const values = {
    acceptablePrice: 0n,
    acceptablePriceDeltaBps: 0n,
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
      shouldCapNegativeImpact: false,
      sizeDeltaInTokens: p.sizeDeltaInTokens,
    }
  );

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

  if (marketInfo.tradeMath === "gmsol") {
    const priceParams = { ...p, marketInfo, priceImpactDeltaUsd };
    const acceptablePrice = isIncrease
      ? getGmsolIncreaseAcceptablePrice(priceParams)
      : getGmsolDecreaseAcceptablePrice(priceParams);

    if (acceptablePrice === undefined) {
      return values;
    }

    values.acceptablePrice = acceptablePrice;
    values.acceptablePriceDeltaBps = getBasisPoints(
      (values.acceptablePrice - indexPrice) * (shouldFlipPriceImpact ? -1n : 1n),
      indexPrice
    );
    return values;
  }

  const acceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease,
    isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
  });

  values.acceptablePrice = acceptablePriceValues.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceValues.acceptablePriceDeltaBps;

  return values;
}

type GmsolAcceptablePriceParams = AcceptablePriceParams & { priceImpactDeltaUsd: bigint };

function getGmsolIncreaseAcceptablePrice(p: GmsolAcceptablePriceParams): bigint | undefined {
  const { indexPrice, sizeDeltaUsd, priceImpactDeltaUsd, isLong, marketInfo } = p;
  const { indexToken } = marketInfo;
  const tokenUnit = expandDecimals(1, indexToken.decimals);
  let baseSizeDeltaInTokens = p.sizeDeltaInTokens;

  if (baseSizeDeltaInTokens == null) {
    baseSizeDeltaInTokens = isLong
      ? bigMath.mulDiv(sizeDeltaUsd, tokenUnit, indexPrice)
      : roundUpMagnitudeDivision(sizeDeltaUsd * tokenUnit, indexPrice);
  }

  const sizeDeltaInTokens = getGmsolIncreaseSizeDeltaInTokens({
    baseSizeDeltaInTokens,
    priceImpactDeltaUsd,
    indexToken,
    isLong,
  });

  return sizeDeltaInTokens === 0n ? undefined : bigMath.mulDiv(sizeDeltaUsd, tokenUnit, sizeDeltaInTokens);
}

function getGmsolDecreaseAcceptablePrice(p: GmsolAcceptablePriceParams): bigint {
  const { marketInfo, indexPrice, sizeDeltaUsd, sizeDeltaInTokens, positionSizeInUsd, positionSizeInTokens, isLong } =
    p;
  const cappedImpactUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeDeltaUsd, p.priceImpactDeltaUsd);
  const tokenUnit = expandDecimals(1, marketInfo.indexToken.decimals);
  let priceAdjustment: bigint;

  if (positionSizeInUsd && positionSizeInTokens) {
    const impactAtEntrySizeUsd = getGmsolUsdAmount(bigMath.mulDiv(positionSizeInUsd, cappedImpactUsd, sizeDeltaUsd));
    priceAdjustment = bigMath.mulDiv(impactAtEntrySizeUsd, tokenUnit, positionSizeInTokens);
  } else if (sizeDeltaInTokens && sizeDeltaInTokens > 0n) {
    priceAdjustment = bigMath.mulDiv(cappedImpactUsd, tokenUnit, sizeDeltaInTokens);
  } else {
    priceAdjustment = bigMath.mulDiv(indexPrice, cappedImpactUsd, sizeDeltaUsd);
  }

  const priceUnit = tokenUnit * GMSOL_PRECISION_SCALE;
  priceAdjustment = bigMath.mulDiv(priceAdjustment, 1n, priceUnit) * priceUnit;

  return indexPrice + (isLong ? priceAdjustment : -priceAdjustment);
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
  acceptablePriceImpactBuffer?: number;
  executionPrice?: bigint;
}) {
  const {
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
    acceptablePriceImpactBuffer = DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER,
    executionPrice,
  } = p;

  if (executionPrice !== undefined && executionPrice > 0n && indexPrice > 0n) {
    const adversePriceDelta = (executionPrice - indexPrice) * (getShouldUseMaxPrice(p.isIncrease, p.isLong) ? 1n : -1n);

    return (
      (adversePriceDelta > 0n ? getBasisPoints(adversePriceDelta, indexPrice, true) : 0n) +
      BigInt(acceptablePriceImpactBuffer)
    );
  }

  if (priceImpactDeltaUsd > 0) {
    return BigInt(acceptablePriceImpactBuffer);
  }

  const baseAcceptablePriceValues = getAcceptablePriceByPriceImpact({
    isIncrease: p.isIncrease,
    isLong: p.isLong,
    indexPrice,
    sizeDeltaUsd,
    priceImpactDeltaUsd,
  });

  if (baseAcceptablePriceValues.acceptablePriceDeltaBps < 0) {
    return bigMath.abs(baseAcceptablePriceValues.acceptablePriceDeltaBps) + BigInt(acceptablePriceImpactBuffer);
  }

  return BigInt(acceptablePriceImpactBuffer);
}
