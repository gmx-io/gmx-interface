import { OrderType } from "types/orders";
import { TokenPrices } from "types/tokens";
import { TriggerThresholdType } from "types/trade";

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

  throw new Error("Invalid trigger order type");
}
