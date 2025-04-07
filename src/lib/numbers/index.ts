import { BigNumberish, ethers } from "ethers";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { bigMath } from "sdk/utils/bigmath";
import { bigintToNumber, PRECISION_DECIMALS } from "sdk/utils/numbers";

export * from "sdk/utils/numbers";
export * from "./formatting";

export const PERCENT_PRECISION_DECIMALS = PRECISION_DECIMALS - 2;

const MAX_EXCEEDING_THRESHOLD = "1000000000";
const MIN_EXCEEDING_THRESHOLD = "0.01";

export const BN_ZERO = 0n;
export const BN_ONE = 1n;
export const BN_NEGATIVE_ONE = -1n;

/**
 *
 * @deprecated Use BigInt instead
 */
export function bigNumberify(n?: BigNumberish | null | undefined) {
  try {
    if (n === undefined) throw new Error("n is undefined");
    if (n === null) throw new Error("n is null");

    return BigInt(n);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("bigNumberify error", e);
    return undefined;
  }
}

export function expandDecimals(n: BigNumberish, decimals: number): bigint {
  return BigInt(n) * 10n ** BigInt(decimals);
}

export function getLimitedDisplay(
  amount: bigint,
  tokenDecimals: number,
  opts: { maxThreshold?: string | null; minThreshold?: string } = {}
) {
  const { maxThreshold = MAX_EXCEEDING_THRESHOLD, minThreshold = MIN_EXCEEDING_THRESHOLD } = opts;
  const max = maxThreshold === null ? null : expandDecimals(maxThreshold, tokenDecimals);
  const min = ethers.parseUnits(minThreshold, tokenDecimals);
  const absAmount = bigMath.abs(amount);

  if (absAmount == 0n) {
    return {
      symbol: "",
      value: absAmount,
    };
  }

  const symbol = max !== null && absAmount > max ? TRIGGER_PREFIX_ABOVE : absAmount < min ? TRIGGER_PREFIX_BELOW : "";
  const value = max !== null && absAmount > max ? max : absAmount < min ? min : absAmount;

  return {
    symbol,
    value,
  };
}

export const trimZeroDecimals = (amount: string) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString();
  }
  return amount;
};

export const limitDecimals = (amount: BigNumberish, maxDecimals?: number) => {
  let amountStr = amount.toString();
  if (maxDecimals === undefined) {
    return amountStr;
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0];
  }
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals));
    }
  }

  return amountStr;
};

export const padDecimals = (amount: BigNumberish, minDecimals: number) => {
  let amountStr = amount.toString();
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0");
    }
  } else {
    amountStr = amountStr + ".0000";
  }
  return amountStr;
};

export const parseValue = (value: string, tokenDecimals: number) => {
  const pValue = parseFloat(value);

  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};

export function roundUpDivision(a: bigint, b: bigint) {
  return (a + b - 1n) / b;
}

export function roundToTwoDecimals(n: number) {
  return Math.round(n * 100) / 100;
}

export function roundToOrder(n: bigint, significantDigits = 1) {
  const decimals = Math.max(n.toString().length - significantDigits, 0);
  return (n / expandDecimals(1, decimals)) * expandDecimals(1, decimals);
}

export function minBigNumber(...args: bigint[]) {
  if (!args.length) return undefined;

  return args.reduce((acc, num) => (num < acc ? num : acc), args[0]);
}

export function maxbigint(...args: bigint[]) {
  if (!args.length) return undefined;

  return args.reduce((acc, num) => (num > acc ? num : acc), args[0]);
}

export function removeTrailingZeros(amount: string | number) {
  const amountWithoutZeros = Number(amount);
  if (!amountWithoutZeros) return amount;
  return amountWithoutZeros;
}

type SerializedBigIntsInObject<T> = {
  [P in keyof T]: T[P] extends bigint
    ? { type: "bigint"; value: bigint }
    : T[P] extends object
      ? SerializedBigIntsInObject<T[P]>
      : T[P];
};

type DeserializeBigIntInObject<T> = {
  [P in keyof T]: T[P] extends { type: "bigint"; value: bigint }
    ? bigint
    : T[P] extends object
      ? DeserializeBigIntInObject<T[P]>
      : T[P];
};

export function serializeBigIntsInObject<T extends object>(obj: T): SerializedBigIntsInObject<T> {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "bigint") {
      result[key] = { type: "bigint", value: String(value) };
    } else if (value && typeof value === "object") {
      result[key] = serializeBigIntsInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function deserializeBigIntsInObject<T extends object>(obj: T): DeserializeBigIntInObject<T> {
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (
      typeof value === "object" &&
      value !== null &&
      (("type" in value && value.type === "bigint") || ("_type" in value && value._type === "BigNumber"))
    ) {
      if ("value" in value && typeof value.value === "string") {
        result[key] = BigInt(value.value);
      } else if ("hex" in value && typeof value.hex === "string") {
        if (value.hex.startsWith("-")) {
          result[key] = BigInt(value.hex.slice(1)) * -1n;
        } else {
          result[key] = BigInt(value.hex);
        }
      }
    } else if (value && typeof value === "object") {
      result[key] = deserializeBigIntsInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function calculateDisplayDecimals(price?: bigint, decimals = USD_DECIMALS, visualMultiplier = 1) {
  if (price === undefined || price === 0n) return 2;
  const priceNumber = bigintToNumber(bigMath.abs(price) * BigInt(visualMultiplier), decimals);

  if (isNaN(priceNumber)) return 2;
  if (priceNumber >= 1000) return 2;
  if (priceNumber >= 100) return 3;
  if (priceNumber >= 1) return 4;
  if (priceNumber >= 0.1) return 5;
  if (priceNumber >= 0.01) return 6;
  if (priceNumber >= 0.0001) return 7;
  if (priceNumber >= 0.00001) return 8;

  return 9;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function absDiffBps(value: bigint, base: bigint) {
  if ((value === 0n && base !== 0n) || (value !== 0n && base === 0n)) {
    return BASIS_POINTS_DIVISOR_BIGINT;
  }

  if (value === 0n && base === 0n) {
    return 0n;
  }

  return bigMath.mulDiv(bigMath.abs(value - base), BASIS_POINTS_DIVISOR_BIGINT, base);
}

export function roundBigNumberWithDecimals(
  value: BigNumberish,
  opts: { displayDecimals: number; tokenDecimals: number }
): BigNumberish {
  if (opts.displayDecimals === opts.tokenDecimals) {
    return value;
  }

  let valueString = value.toString();
  let isNegative = false;

  if (valueString[0] === "-") {
    valueString = valueString.slice(1);
    isNegative = true;
  }

  if (valueString.length < opts.tokenDecimals) {
    valueString = valueString.padStart(opts.tokenDecimals, "0");
  }

  const mainPart = valueString.slice(0, valueString.length - opts.tokenDecimals + opts.displayDecimals);
  const partToRound = valueString.slice(valueString.length - opts.tokenDecimals + opts.displayDecimals);

  let mainPartBigInt = BigInt(mainPart);

  let returnValue = mainPartBigInt;

  if (partToRound.length !== 0) {
    if (Number(partToRound[0]) >= 5) {
      mainPartBigInt += 1n;
    }

    returnValue = BigInt(mainPartBigInt.toString() + new Array(partToRound.length).fill("0").join(""));
  }

  return isNegative ? returnValue * -1n : returnValue;
}

export function toBigNumberWithDecimals(value: string, decimals: number): bigint {
  if (!value) return BN_ZERO;

  const parts = value.split(".");
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : "";

  const paddingZeros = decimals - decimalPart.length;

  if (paddingZeros >= 0) {
    const result = integerPart + decimalPart + "0".repeat(paddingZeros);
    return BigInt(result);
  } else {
    const result = integerPart + decimalPart.substring(0, decimals);
    return BigInt(result);
  }
}
