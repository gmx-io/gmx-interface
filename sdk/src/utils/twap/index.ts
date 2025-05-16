import { DEFAULT_TWAP_NUMBER_OF_PARTS, MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "configs/twap";
import { OrderType } from "types/orders";
import { TwapDuration } from "types/twap";
import { isSwapOrderType } from "utils/orders";

export function getIsValidTwapParams(duration: TwapDuration, numberOfParts: number) {
  return (
    duration.hours >= 0 &&
    duration.minutes >= 0 &&
    numberOfParts >= MIN_TWAP_NUMBER_OF_PARTS &&
    numberOfParts <= MAX_TWAP_NUMBER_OF_PARTS
  );
}

export function getTwapDurationInSeconds(duration: TwapDuration) {
  return duration.hours * 60 * 60 + duration.minutes * 60;
}

export function getTwapValidFromTime(duration: TwapDuration, numberOfParts: number, partIndex: number) {
  const durationMinutes = duration.hours * 60 + duration.minutes;
  const durationMs = durationMinutes * 60;
  const startTime = Math.ceil(Date.now() / 1000);

  return BigInt(Math.floor(startTime + (durationMs / (numberOfParts - 1)) * partIndex));
}

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
