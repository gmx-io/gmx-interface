import { OrderType } from "domain/synthetics/orders";
import { TokenPrices } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "lib/legacy";
import { getBasisPoints } from "lib/numbers";
import { TriggerThresholdType } from "../types";

export function getMarkPrice(p: { prices: TokenPrices; isIncrease: boolean; isLong: boolean }) {
  const { prices, isIncrease, isLong } = p;

  const shouldUseMaxPrice = getShouldUseMaxPrice(isIncrease, isLong);

  return shouldUseMaxPrice ? prices.maxPrice : prices.minPrice;
}

export function getAcceptablePrice(p: {
  isIncrease: boolean;
  isLong: boolean;
  indexPrice: BigNumber;
  priceImpactDeltaUsd?: BigNumber;
  sizeDeltaUsd: BigNumber;
  acceptablePriceImpactBps?: BigNumber;
}) {
  let acceptablePrice = p.indexPrice;
  let acceptablePriceImpactBps = p.acceptablePriceImpactBps || BigNumber.from(0);

  const shouldFlipPriceImpact = getShouldUseMaxPrice(p.isIncrease, p.isLong);

  if (acceptablePriceImpactBps.abs().gt(0)) {
    let priceDelta = p.indexPrice.mul(acceptablePriceImpactBps).div(BASIS_POINTS_DIVISOR);
    priceDelta = shouldFlipPriceImpact ? priceDelta?.mul(-1) : priceDelta;

    acceptablePrice = p.indexPrice.sub(priceDelta);
  } else if (p.sizeDeltaUsd?.gt(0) && p.priceImpactDeltaUsd?.abs().gt(0)) {
    const priceImpactForPriceAdjustment = shouldFlipPriceImpact ? p.priceImpactDeltaUsd.mul(-1) : p.priceImpactDeltaUsd;
    acceptablePrice = p.indexPrice.mul(p.sizeDeltaUsd.add(priceImpactForPriceAdjustment)).div(p.sizeDeltaUsd);

    const priceDelta = p.indexPrice
      .sub(acceptablePrice)
      .abs()
      .mul(p.priceImpactDeltaUsd.isNegative() ? -1 : 1);

    acceptablePriceImpactBps = getBasisPoints(priceDelta, p.indexPrice);
  }

  return {
    acceptablePrice,
    acceptablePriceImpactBps,
  };
}

export function applySlippage(allowedSlippage: number, price: BigNumber, isIncrease: boolean, isLong: boolean) {
  const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

  const slippageBasisPoints = shouldIncreasePrice
    ? BASIS_POINTS_DIVISOR + allowedSlippage
    : BASIS_POINTS_DIVISOR - allowedSlippage;

  return price.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);
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
  triggerPrice: BigNumber;
  markPrice: BigNumber;
  isLong: boolean;
}): OrderType.LimitDecrease | OrderType.StopLossDecrease {
  const { triggerPrice, markPrice, isLong } = p;

  const isTriggerAboveMarkPrice = triggerPrice.gt(markPrice);

  if (isTriggerAboveMarkPrice) {
    return isLong ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  } else {
    return isLong ? OrderType.StopLossDecrease : OrderType.LimitDecrease;
  }
}
