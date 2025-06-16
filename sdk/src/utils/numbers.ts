import { formatUnits, parseUnits } from "viem";

import { bigMath } from "./bigmath";

export type Numeric = number | bigint;
export type BigNumberish = string | Numeric;

export const USD_DECIMALS = 30;

export const BASIS_POINTS_DIVISOR = 10000;
export const BASIS_POINTS_DIVISOR_BIGINT = 10000n;
export const BASIS_POINTS_DECIMALS = 4;

export const PRECISION_DECIMALS = 30;
export const PRECISION = expandDecimals(1, PRECISION_DECIMALS);

export const BN_ZERO = 0n;
export const BN_ONE = 1n;
export const BN_NEGATIVE_ONE = -1n;

export const MaxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

export const PERCENT_PRECISION_DECIMALS = PRECISION_DECIMALS - 2;

const MAX_EXCEEDING_THRESHOLD = "1000000000";
const MIN_EXCEEDING_THRESHOLD = "0.01";

export const TRIGGER_PREFIX_ABOVE = ">";
export const TRIGGER_PREFIX_BELOW = "<";

export function expandDecimals(n: BigNumberish, decimals: number): bigint {
  return BigInt(n) * 10n ** BigInt(decimals);
}

export function basisPointsToFloat(basisPoints: bigint) {
  return (basisPoints * PRECISION) / BASIS_POINTS_DIVISOR_BIGINT;
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

export function roundUpMagnitudeDivision(a: bigint, b: bigint) {
  if (a < 0n) {
    return (a - b + 1n) / b;
  }

  return (a + b - 1n) / b;
}

export function applyFactor(value: bigint, factor: bigint) {
  return (value * factor) / PRECISION;
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

export const trimZeroDecimals = (amount: string) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString();
  }
  return amount;
};

export function bigintToNumber(value: bigint, decimals: number) {
  const negative = value < 0;
  if (negative) value *= -1n;
  const precision = 10n ** BigInt(decimals);
  const int = value / precision;
  const frac = value % precision;

  const num = parseFloat(`${int}.${frac.toString().padStart(decimals, "0")}`);
  return negative ? -num : num;
}

export function adjustForDecimals(amount: bigint, divDecimals: number, mulDecimals: number) {
  return (amount * expandDecimals(1, mulDecimals)) / expandDecimals(1, divDecimals);
}

export function formatUsd(
  usd?: bigint,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    maxThreshold?: string | null;
    minThreshold?: string;
    displayPlus?: boolean;
    visualMultiplier?: number;
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

  if (opts.visualMultiplier) {
    usd *= BigInt(opts.visualMultiplier);
  }

  const defaultMinThreshold = displayDecimals > 1 ? "0." + "0".repeat(displayDecimals - 1) + "1" : undefined;

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, {
    maxThreshold: opts.maxThreshold,
    minThreshold: opts.minThreshold ?? defaultMinThreshold,
  });

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
  const percentageStr = percentage !== undefined ? ` (${sign}${formatPercentage(bigMath.abs(percentage))})` : "";
  const deltaUsdStr = formatAmount(exceedingInfo.value, USD_DECIMALS, 2, true);
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";

  return `${symbol}${sign}$${deltaUsdStr}${percentageStr}`;
}

export function formatPercentage(
  percentage?: bigint,
  opts: { fallbackToZero?: boolean; signed?: boolean; displayDecimals?: number; bps?: boolean } = {}
) {
  const { fallbackToZero = false, signed = false, displayDecimals = 2, bps = true } = opts;

  if (percentage === undefined) {
    if (fallbackToZero) {
      return `${formatAmount(0n, PERCENT_PRECISION_DECIMALS, displayDecimals)}%`;
    }

    return undefined;
  }

  const sign = signed ? getPlusOrMinusSymbol(percentage) : "";

  return `${sign}${formatAmount(bigMath.abs(percentage), bps ? 2 : PERCENT_PRECISION_DECIMALS, displayDecimals)}%`;
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
    isStable?: boolean;
  } = {}
) {
  const {
    showAllSignificant = false,
    fallbackToZero = false,
    useCommas = false,
    minThreshold = "0",
    maxThreshold,
  } = opts;

  const displayDecimals = opts.displayDecimals ?? (opts.isStable ? 2 : 4);

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
    amountStr = `${symbol}${sign}${formatAmount(exceedingInfo.value, tokenDecimals, displayDecimals, useCommas, undefined)}`;
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
    isStable?: boolean;
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

export function formatUsdPrice(price?: bigint, opts: Parameters<typeof formatUsd>[1] = {}) {
  if (price === undefined) {
    return;
  }

  if (price < 0n) {
    return "NA";
  }

  const decimals = calculateDisplayDecimals(price, undefined, opts.visualMultiplier);

  return formatUsd(price, {
    ...opts,
    displayDecimals: decimals,
  });
}

export function formatPercentageDisplay(percentage: number, hideThreshold?: number) {
  if (hideThreshold && percentage < hideThreshold) {
    return "";
  }

  return `${percentage}%`;
}

export function formatAmountHuman(
  amount: BigNumberish | undefined,
  tokenDecimals: number,
  showDollar = false,
  displayDecimals = 1
) {
  if (amount === undefined) {
    return "...";
  }

  let n = Number(formatAmount(amount, tokenDecimals));
  // For large numbers, we can neglect the decimals to avoid decimals in cases like 9999999.99999
  if (n >= 1_000_000) {
    n = Math.round(n);
  }
  const isNegative = n < 0;
  const absN = Math.abs(n);
  const sign = showDollar ? "$" : "";

  if (absN >= 1_000_000_000) {
    return `${isNegative ? "-" : ""}${sign}${(absN / 1_000_000_000).toFixed(displayDecimals)}b`;
  }

  if (absN >= 1_000_000) {
    return `${isNegative ? "-" : ""}${sign}${(absN / 1_000_000).toFixed(displayDecimals)}m`;
  }

  if (absN >= 1000) {
    return `${isNegative ? "-" : ""}${sign}${(absN / 1_000).toFixed(displayDecimals)}k`;
  }

  return `${isNegative ? "-" : ""}${sign}${absN.toFixed(displayDecimals)}`;
}

export function formatBalanceAmount(
  amount: bigint,
  tokenDecimals: number,
  tokenSymbol?: string,
  {
    showZero = false,
    toExponential = true,
    isStable = false,
  }: {
    showZero?: boolean;
    toExponential?: boolean;
    isStable?: boolean;
  } = {}
): string {
  if (amount === undefined) return "-";

  if (amount === 0n) {
    if (showZero === true) {
      if (tokenSymbol) {
        if (isStable) {
          return `0.00 ${tokenSymbol}`;
        }
        return `0.0000 ${tokenSymbol}`;
      }
      if (isStable) {
        return "0.00";
      }
      return "0.0000";
    }

    return "-";
  }

  const absAmount = bigMath.abs(amount);
  const absAmountFloat = bigintToNumber(absAmount, tokenDecimals);

  let value = "";

  const baseDecimals = isStable ? 2 : 4;
  if (absAmountFloat >= 1) value = formatAmount(amount, tokenDecimals, baseDecimals, true);
  else if (absAmountFloat >= 0.1) value = formatAmount(amount, tokenDecimals, baseDecimals + 1, true);
  else if (absAmountFloat >= 0.01) value = formatAmount(amount, tokenDecimals, baseDecimals + 2, true);
  else if (absAmountFloat >= 0.001) value = formatAmount(amount, tokenDecimals, baseDecimals + 3, true);
  else if (absAmountFloat >= 1e-8) value = formatAmount(amount, tokenDecimals, 8, true);
  else {
    if (toExponential) {
      value = bigintToNumber(amount, tokenDecimals).toExponential(2);
    } else {
      value = bigintToNumber(amount, tokenDecimals).toFixed(8);
    }
  }

  if (tokenSymbol) {
    // Non-breaking space
    return `${value} ${tokenSymbol}`;
  }

  return value;
}

export function formatFactor(factor: bigint) {
  if (factor == 0n) {
    return "0";
  }

  if (bigMath.abs(factor) > PRECISION * 1000n) {
    return (factor / PRECISION).toString();
  }

  const trailingZeroes =
    bigMath
      .abs(factor)
      .toString()
      .match(/^(.+?)(?<zeroes>0*)$/)?.groups?.zeroes?.length || 0;
  const factorDecimals = 30 - trailingZeroes;
  return formatAmount(factor, 30, factorDecimals);
}
export function numberWithCommas(x: BigNumberish) {
  if (x === undefined || x === null) {
    return "...";
  }

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export const formatAmount = (
  amount: BigNumberish | undefined,
  tokenDecimals: number,
  displayDecimals?: number,
  useCommas?: boolean,
  defaultValue?: string,
  visualMultiplier?: number
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
  const amountBigInt = roundWithDecimals(BigInt(amount) * BigInt(visualMultiplier ?? 1), {
    displayDecimals,
    decimals: tokenDecimals,
  });
  let amountStr = formatUnits(amountBigInt, tokenDecimals);
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

  amount = BigInt(amount);

  let amountStr = formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export function getLimitedDisplay(
  amount: bigint,
  tokenDecimals: number,
  opts: { maxThreshold?: BigNumberish | null; minThreshold?: BigNumberish } = {}
) {
  const { maxThreshold = MAX_EXCEEDING_THRESHOLD, minThreshold = MIN_EXCEEDING_THRESHOLD } = opts;
  const max = maxThreshold === null ? null : expandDecimals(BigInt(maxThreshold), tokenDecimals);
  const min = parseUnits(minThreshold.toString(), tokenDecimals);
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
    amountStr = amountStr + "." + "0".repeat(minDecimals);
  }
  return amountStr;
};

export function getPlusOrMinusSymbol(value?: bigint, opts: { showPlusForZero?: boolean } = {}): string {
  if (value === undefined) {
    return "";
  }

  const { showPlusForZero = false } = opts;
  return value === 0n ? (showPlusForZero ? "+" : "") : value < 0n ? "-" : "+";
}

export function roundWithDecimals(value: BigNumberish, opts: { displayDecimals: number; decimals: number }): bigint {
  if (opts.displayDecimals === opts.decimals) {
    return BigInt(value);
  }

  let valueString = value.toString();
  let isNegative = false;

  if (valueString[0] === "-") {
    valueString = valueString.slice(1);
    isNegative = true;
  }

  if (valueString.length < opts.decimals) {
    valueString = valueString.padStart(opts.decimals, "0");
  }

  const mainPart = valueString.slice(0, valueString.length - opts.decimals + opts.displayDecimals);
  const partToRound = valueString.slice(valueString.length - opts.decimals + opts.displayDecimals);

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

// TODO: Remove this function
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

export const parseValue = (value: string, tokenDecimals: number) => {
  const pValue = parseFloat(value);

  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = parseUnits(value, tokenDecimals);
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

export function roundBigIntToDecimals(value: bigint, tokenDecimals: number, roundToDecimals: number): bigint {
  const excessDecimals = tokenDecimals - roundToDecimals;
  const divisor = BigInt(10 ** excessDecimals);
  const scaledValue = value / divisor;
  const remainder = scaledValue % 10n;
  const roundedValue = remainder >= 5n ? scaledValue + 10n - remainder : scaledValue - remainder;
  return roundedValue * divisor;
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

export function calculateDisplayDecimals(
  price?: bigint,
  decimals = USD_DECIMALS,
  visualMultiplier = 1,
  isStable = false
) {
  if (price === undefined || price === 0n) return 2;
  const priceNumber = bigintToNumber(bigMath.abs(price) * BigInt(visualMultiplier), decimals);

  if (isNaN(priceNumber)) return 2;
  if (isStable) {
    if (priceNumber >= 0.1) return 2;
    if (priceNumber >= 0.01) return 3;
    if (priceNumber >= 0.001) return 4;
    if (priceNumber >= 0.0001) return 5;
    if (priceNumber >= 0.00001) return 6;
    if (priceNumber >= 0.000001) return 7;
    if (priceNumber >= 0.0000001) return 8;
    if (priceNumber >= 0.00000001) return 9;
  } else {
    if (priceNumber >= 1000) return 2;
    if (priceNumber >= 100) return 3;
    if (priceNumber >= 1) return 4;
    if (priceNumber >= 0.1) return 5;
    if (priceNumber >= 0.01) return 6;
    if (priceNumber >= 0.0001) return 7;
    if (priceNumber >= 0.00001) return 8;
  }

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
