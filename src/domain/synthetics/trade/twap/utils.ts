import { OrderType } from "sdk/types/orders";
import { isSwapOrderType } from "sdk/utils/orders";

export const DEFAULT_TWAP_NUMBER_OF_PARTS = 5;
export const MIN_TWAP_NUMBER_OF_PARTS = 2;
export const MAX_TWAP_NUMBER_OF_PARTS = 30;

export function changeTWAPNumberOfPartsValue(value: number) {
  if (value < MIN_TWAP_NUMBER_OF_PARTS) {
    return MIN_TWAP_NUMBER_OF_PARTS;
  }
  if (value > MAX_TWAP_NUMBER_OF_PARTS) {
    return MAX_TWAP_NUMBER_OF_PARTS;
  }
  if (isNaN(value)) {
    return DEFAULT_TWAP_NUMBER_OF_PARTS;
  }

  return value;
}

export function getTWAPOrderKey({
  twapId,
  orderType,
  pool,
  isLong,
  collateralTokenSymbol,
}: {
  twapId: string;
  orderType: OrderType;
  pool: string;
  collateralTokenSymbol: string;
  isLong: boolean;
}) {
  let type = "short";

  if (isSwapOrderType(orderType)) {
    type = "swap";
  } else if (isLong) {
    type = "long";
  }

  return `${twapId}-${type}-${pool}-${collateralTokenSymbol}`;
}
