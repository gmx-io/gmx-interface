import { OrderType } from "domain/synthetics/orders";

export * from "sdk/utils/prices";

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
