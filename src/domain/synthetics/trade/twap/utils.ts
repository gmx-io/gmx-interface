import { OrderType } from "sdk/types/orders";
import { isSwapOrderType } from "sdk/utils/orders";

import { TwapDuration } from "./types";

export const DEFAULT_TWAP_NUMBER_OF_PARTS = 5;
export const MIN_TWAP_NUMBER_OF_PARTS = 2;
export const MAX_TWAP_NUMBER_OF_PARTS = 30;

export const DEFAULT_TWAP_DURATION = {
  minutes: 0,
  hours: 10,
};

export function changeTwapNumberOfPartsValue(value: number) {
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

export function getTwapOrderKey({
  twapId,
  orderType,
  pool,
  isLong,
  collateralTokenSymbol,
  swapPath,
  account,
  initialCollateralToken,
}: {
  twapId: string;
  orderType: OrderType;
  pool: string;
  collateralTokenSymbol: string;
  initialCollateralToken: string;
  isLong: boolean;
  swapPath: string[];
  account: string;
}) {
  if (isSwapOrderType(orderType)) {
    return `${twapId}-${swapPath.join("-")}-${account}-${initialCollateralToken}`;
  }

  const type = isLong ? "long" : "short";
  return `${twapId}-${type}-${pool}-${collateralTokenSymbol}`;
}

export function makeTwapValidFromTimeGetter(duration: TwapDuration, numberOfParts: number) {
  const durationMinutes = duration.hours * 60 + duration.minutes;
  const durationMs = durationMinutes * 60;
  const startTime = Math.ceil(Date.now() / 1000);

  return (part: number) => {
    return BigInt(Math.floor(startTime + (durationMs / (numberOfParts - 1)) * part));
  };
}

export function getTwapDurationInSeconds(duration: TwapDuration | undefined) {
  if (!duration) {
    return undefined;
  }
  return duration.hours * 60 * 60 + duration.minutes * 60;
}
