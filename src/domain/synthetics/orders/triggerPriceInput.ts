import { USD_DECIMALS } from "config/factors";
import { calculateDisplayDecimals, formatAmount } from "lib/numbers";
import { isPositionOrder, isTriggerDecreaseOrderType } from "sdk/utils/orders";

import type { OrderInfo } from "./types";

export function formatTriggerPriceInputValue(price: bigint, visualMultiplier: number | undefined): string {
  return formatAmount(
    price,
    USD_DECIMALS,
    calculateDisplayDecimals(price, USD_DECIMALS, visualMultiplier),
    undefined,
    undefined,
    visualMultiplier
  );
}

export function getStoredTpSlTriggerPrice(
  order: OrderInfo | undefined,
  triggerPriceInputValue: string
): bigint | undefined {
  if (
    !order ||
    !isPositionOrder(order) ||
    !isTriggerDecreaseOrderType(order.orderType) ||
    triggerPriceInputValue !== formatTriggerPriceInputValue(order.triggerPrice, order.indexToken?.visualMultiplier)
  ) {
    return undefined;
  }

  return order.triggerPrice;
}
