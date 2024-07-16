import { BigNumberish, ethers } from "ethers";
import { PRECISION, USD_DECIMALS } from "./legacy";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { getPlusOrMinusSymbol } from "./utils";
import { bigMath } from "./bigmath";

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

function getLimitedDisplay(
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

export const formatAmount = (
  amount: BigNumberish | undefined,
  tokenDecimals: number,
  displayDecimals?: number,
  useCommas?: boolean,
  defaultValue?: string
) => {
  if (defaultValue === undefined || defaultValue === null) {
    defaultValue = "...";
  }
  if (amount === undefined || amount === null || amount === "") {
    return defaultValue;
  }
  if (displayDecimals === undefined) {
    displayDecimals = 4;
  }
  let amountStr = ethers.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals);
  }
  if (useCommas) {
    return numberWithCommas(amountStr);
  }
  return amountStr;
};

export const formatKeyAmount = <T extends {}>(
  map: T | undefined,
  key: keyof T,
  tokenDecimals: number,
  displayDecimals: number,
  useCommas?: boolean
) => {
  const value = map ? map[key] ?? undefined : undefined;
  if (value === undefined || value === null) {
    return "...";
  }

  return formatAmount(value as bigint, tokenDecimals, displayDecimals, useCommas);
};

export const formatArrayAmount = (
  arr: any[],
  index: number,
  tokenDecimals: number,
  displayDecimals?: number,
  useCommas?: boolean
) => {
  if (!arr || arr[index] === undefined || arr[index] === null) {
    return "...";
  }

  return formatAmount(arr[index], tokenDecimals, displayDecimals, useCommas);
};

export const formatAmountFree = (amount: BigNumberish, tokenDecimals: number, displayDecimals?: number) => {
  if (amount === undefined || amount === null) {
    return "...";
  }
  let amountStr = ethers.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export function formatUsd(
  usd?: bigint,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    maxThreshold?: string | null;
    minThreshold?: string;
    displayPlus?: boolean;
  } = {}
) {
  const { fallbackToZero = false, displayDecimals = 2 } = opts;

  if (typeof usd !== "bigint") {
    if (fallbackToZero) {
      usd = 0n;
    } else {
      return undefined;
    }
  }

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, opts);

  const maybePlus = opts.displayPlus ? "+" : "";
  const sign = usd < 0n ? "-" : maybePlus;
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";
  const displayUsd = formatAmount(exceedingInfo.value, USD_DECIMALS, displayDecimals, true);
  return `${symbol}${sign}$${displayUsd}`;
}

export function formatDeltaUsd(
  deltaUsd?: bigint,
  percentage?: bigint,
  opts: { fallbackToZero?: boolean; showPlusForZero?: boolean } = {}
) {
  if (typeof deltaUsd !== "bigint") {
    if (opts.fallbackToZero) {
      return `${formatUsd(0n)} (${formatAmount(0n, 2, 2)}%)`;
    }

    return undefined;
  }

  const sign = getPlusOrMinusSymbol(deltaUsd, { showPlusForZero: opts.showPlusForZero });

  const exceedingInfo = getLimitedDisplay(deltaUsd, USD_DECIMALS);
  const percentageStr = percentage ? ` (${sign}${formatPercentage(bigMath.abs(percentage))})` : "";
  const deltaUsdStr = formatAmount(exceedingInfo.value, USD_DECIMALS, 2, true);
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";

  return `${symbol}${sign}$${deltaUsdStr}${percentageStr}`;
}

export function formatPercentage(percentage?: bigint, opts: { fallbackToZero?: boolean; signed?: boolean } = {}) {
  const { fallbackToZero = false, signed = false } = opts;

  if (typeof percentage !== "bigint") {
    if (fallbackToZero) {
      return `${formatAmount(0n, 2, 2)}%`;
    }

    return undefined;
  }

  const sign = signed ? getPlusOrMinusSymbol(percentage) : "";

  return `${sign}${formatAmount(bigMath.abs(percentage), 2, 2)}%`;
}

export function formatTokenAmount(
  amount?: bigint,
  tokenDecimals?: number,
  symbol?: string,
  opts: {
    showAllSignificant?: boolean;
    displayDecimals?: number;
    fallbackToZero?: boolean;
    useCommas?: boolean;
    minThreshold?: string;
    maxThreshold?: string;
    displayPlus?: boolean;
  } = {}
) {
  const {
    displayDecimals = 4,
    showAllSignificant = false,
    fallbackToZero = false,
    useCommas = false,
    minThreshold = "0",
    maxThreshold,
  } = opts;

  const symbolStr = symbol ? ` ${symbol}` : "";

  if (typeof amount !== "bigint" || !tokenDecimals) {
    if (fallbackToZero) {
      amount = 0n;
      tokenDecimals = displayDecimals;
    } else {
      return undefined;
    }
  }

  let amountStr: string;

  const maybePlus = opts.displayPlus ? "+" : "";
  const sign = amount < 0n ? "-" : maybePlus;

  if (showAllSignificant) {
    amountStr = formatAmountFree(amount, tokenDecimals, tokenDecimals);
  } else {
    const exceedingInfo = getLimitedDisplay(amount, tokenDecimals, { maxThreshold, minThreshold });
    const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";
    amountStr = `${symbol}${sign}${formatAmount(exceedingInfo.value, tokenDecimals, displayDecimals, useCommas)}`;
  }

  return `${amountStr}${symbolStr}`;
}

export function formatTokenAmountWithUsd(
  tokenAmount?: bigint,
  usdAmount?: bigint,
  tokenSymbol?: string,
  tokenDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    displayPlus?: boolean;
  } = {}
) {
  if (typeof tokenAmount !== "bigint" || typeof usdAmount !== "bigint" || !tokenSymbol || !tokenDecimals) {
    if (!opts.fallbackToZero) {
      return undefined;
    }
  }

  const tokenStr = formatTokenAmount(tokenAmount, tokenDecimals, tokenSymbol, {
    ...opts,
    useCommas: true,
    displayPlus: opts.displayPlus,
  });

  const usdStr = formatUsd(usdAmount, {
    fallbackToZero: opts.fallbackToZero,
    displayPlus: opts.displayPlus,
  });

  return `${tokenStr} (${usdStr})`;
}

export const parseValue = (value: string, tokenDecimals: number) => {
  const pValue = parseFloat(value);

  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};

export function numberWithCommas(x: BigNumberish) {
  if (x === undefined || x === null) {
    return "...";
  }

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function roundUpDivision(a: bigint, b: bigint) {
  return (a + b - 1n) / b;
}

export function roundUpMagnitudeDivision(a: bigint, b: bigint) {
  if (a < 0n) {
    return (a - b + 1n) / b;
  }

  return (a + b - 1n) / b;
}

export function applyFactor(value: bigint, factor: bigint) {
  return (value * factor) / PRECISION;
}

export function getBasisPoints(numerator: bigint, denominator: bigint, shouldRoundUp = false) {
  const result = (numerator * BASIS_POINTS_DIVISOR_BIGINT) / denominator;

  if (shouldRoundUp) {
    const remainder = (numerator * BASIS_POINTS_DIVISOR_BIGINT) % denominator;
    if (remainder !== 0n) {
      return result < 0n ? result - 1n : result + 1n;
    }
  }

  return result;
}

/**
 *
 * @param opts.signed - Default `true`. whether to display a `+` or `-` sign for all non-zero values.
 */
export function formatRatePercentage(rate?: bigint, opts?: { displayDecimals?: number; signed?: boolean }) {
  if (typeof rate !== "bigint") {
    return "-";
  }

  const signed = opts?.signed ?? true;
  const plurOrMinus = signed ? getPlusOrMinusSymbol(rate) : "";

  const amount = bigMath.abs(rate * 100n);
  return `${plurOrMinus}${formatAmount(amount, 30, opts?.displayDecimals ?? 4)}%`;
}

export function basisPointsToFloat(basisPoints: bigint) {
  return (basisPoints * PRECISION) / BASIS_POINTS_DIVISOR_BIGINT;
}

export function roundToTwoDecimals(n: number) {
  return Math.round(n * 100) / 100;
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

export function bigintToNumber(value: bigint, decimals: number) {
  const negative = value < 0;
  if (negative) value *= -1n;
  const precision = 10n ** BigInt(decimals);
  const int = value / precision;
  const frac = value % precision;

  const num = parseFloat(`${int}.${frac.toString().padStart(decimals, "0")}`);
  return negative ? -num : num;
}

export function numberToBigint(value: number, decimals: number) {
  const negative = value < 0;
  if (negative) value *= -1;

  const int = Math.trunc(value);
  let frac = value - int;

  let res = BigInt(int);

  for (let i = 0; i < decimals; i++) {
    res *= 10n;
    if (frac !== 0) {
      frac *= 10;
      const fracInt = Math.trunc(frac);
      res += BigInt(fracInt);
      frac -= fracInt;
    }
  }

  return negative ? -res : res;
}
