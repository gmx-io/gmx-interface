import { BigNumber, BigNumberish, ethers } from "ethers";
import { PRECISION, USD_DECIMALS } from "./legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { getPlusOrMinusSymbol } from "./utils";

const MAX_EXCEEDING_THRESHOLD = "1000000000";
const MIN_EXCEEDING_THRESHOLD = "0.01";

export const BN_ZERO = BigNumber.from(0);
export const BN_ONE = BigNumber.from(1);
export const BN_NEGATIVE_ONE = BigNumber.from(-1);

/**
 *
 * @deprecated Use BigNumber.from instead
 */
export function bigNumberify(n?: BigNumberish) {
  try {
    return BigNumber.from(n);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("bigNumberify error", e);
    return undefined;
  }
}

export function expandDecimals(n: BigNumberish, decimals: number): BigNumber {
  // @ts-ignore
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals));
}

function getLimitedDisplay(
  amount: BigNumber,
  tokenDecimals: number,
  opts: { maxThreshold?: string; minThreshold?: string } = {}
) {
  const { maxThreshold = MAX_EXCEEDING_THRESHOLD, minThreshold = MIN_EXCEEDING_THRESHOLD } = opts;
  const max = expandDecimals(maxThreshold, tokenDecimals);
  const min = ethers.parseUnits(minThreshold, tokenDecimals);
  const absAmount = amount.abs();

  if (absAmount.eq(0)) {
    return {
      symbol: "",
      value: absAmount,
    };
  }

  const symbol = absAmount.gt(max) ? TRIGGER_PREFIX_ABOVE : absAmount.lt(min) ? TRIGGER_PREFIX_BELOW : "";
  const value = absAmount.gt(max) ? max : absAmount.lt(min) ? min : absAmount;

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
  if (!defaultValue) {
    defaultValue = "...";
  }
  if (amount === undefined || amount.toString().length === 0) {
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
  if (!map || !map[key]) {
    return "...";
  }

  return formatAmount(map[key] as unknown as BigNumber, tokenDecimals, displayDecimals, useCommas);
};

export const formatArrayAmount = (
  arr: any[],
  index: number,
  tokenDecimals: number,
  displayDecimals?: number,
  useCommas?: boolean
) => {
  if (!arr || !arr[index]) {
    return "...";
  }

  return formatAmount(arr[index], tokenDecimals, displayDecimals, useCommas);
};

export const formatAmountFree = (amount: BigNumberish, tokenDecimals: number, displayDecimals?: number) => {
  if (!amount) {
    return "...";
  }
  let amountStr = ethers.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export function formatUsd(
  usd?: BigNumber,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    maxThreshold?: string;
    minThreshold?: string;
    displayPlus?: boolean;
  } = {}
) {
  const { fallbackToZero = false, displayDecimals = 2 } = opts;

  if (!usd) {
    if (fallbackToZero) {
      usd = BigNumber.from(0);
    } else {
      return undefined;
    }
  }

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, opts);

  const maybePlus = opts.displayPlus ? "+" : "";
  const sign = usd.lt(0) ? "-" : maybePlus;
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";
  const displayUsd = formatAmount(exceedingInfo.value, USD_DECIMALS, displayDecimals, true);
  return `${symbol}${sign}$${displayUsd}`;
}

export function formatDeltaUsd(
  deltaUsd?: BigNumber,
  percentage?: BigNumber,
  opts: { fallbackToZero?: boolean; showPlusForZero?: boolean } = {}
) {
  if (!deltaUsd) {
    if (opts.fallbackToZero) {
      return `${formatUsd(BigNumber.from(0))} (${formatAmount(BigNumber.from(0), 2, 2)}%)`;
    }

    return undefined;
  }

  const sign = getPlusOrMinusSymbol(deltaUsd, { showPlusForZero: opts.showPlusForZero });

  const exceedingInfo = getLimitedDisplay(deltaUsd, USD_DECIMALS);
  const percentageStr = percentage ? ` (${sign}${formatPercentage(percentage.abs())})` : "";
  const deltaUsdStr = formatAmount(exceedingInfo.value, USD_DECIMALS, 2, true);
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";

  return `${symbol}${sign}$${deltaUsdStr}${percentageStr}`;
}

export function formatPercentage(percentage?: BigNumber, opts: { fallbackToZero?: boolean; signed?: boolean } = {}) {
  const { fallbackToZero = false, signed = false } = opts;

  if (!percentage) {
    if (fallbackToZero) {
      return `${formatAmount(BigNumber.from(0), 2, 2)}%`;
    }

    return undefined;
  }

  const sign = signed ? getPlusOrMinusSymbol(percentage) : "";

  return `${sign}${formatAmount(percentage.abs(), 2, 2)}%`;
}

export function formatTokenAmount(
  amount?: BigNumber,
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

  if (!amount || !tokenDecimals) {
    if (fallbackToZero) {
      amount = BigNumber.from(0);
      tokenDecimals = displayDecimals;
    } else {
      return undefined;
    }
  }

  let amountStr: string;

  const maybePlus = opts.displayPlus ? "+" : "";
  const sign = amount.lt(0) ? "-" : maybePlus;

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
  tokenAmount?: BigNumber,
  usdAmount?: BigNumber,
  tokenSymbol?: string,
  tokenDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
    displayPlus?: boolean;
  } = {}
) {
  if (!tokenAmount || !usdAmount || !tokenSymbol || !tokenDecimals) {
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
  if (!x) {
    return "...";
  }

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function roundUpDivision(a: BigNumber, b: BigNumber) {
  return a.add(b).sub(1).div(b);
}

export function roundUpMagnitudeDivision(a: BigNumber, b: BigNumber) {
  if (a.lt(0)) {
    return a.sub(b).add(1).div(b);
  }

  return a.add(b).sub(1).div(b);
}

export function applyFactor(value: BigNumber, factor: BigNumber) {
  return value.mul(factor).div(PRECISION);
}

export function getBasisPoints(numerator: BigNumber, denominator: BigNumber, shouldRoundUp = false) {
  const result = numerator.mul(BASIS_POINTS_DIVISOR).div(denominator);

  if (shouldRoundUp) {
    const remainder = numerator.mul(BASIS_POINTS_DIVISOR).mod(denominator);
    if (!remainder.isZero()) {
      return result.isNegative() ? result.sub(1) : result.add(1);
    }
  }

  return result;
}

/**
 *
 * @param opts.signed - Default `true`. whether to display a `+` or `-` sign for all non-zero values.
 */
export function formatRatePercentage(rate?: BigNumber, opts?: { displayDecimals?: number; signed?: boolean }) {
  if (!rate) {
    return "-";
  }

  const signed = opts?.signed ?? true;
  const plurOrMinus = signed ? getPlusOrMinusSymbol(rate) : "";

  return `${plurOrMinus}${formatAmount(rate.mul(100).abs(), 30, opts?.displayDecimals ?? 4)}%`;
}

export function basisPointsToFloat(basisPoints: BigNumber) {
  return basisPoints.mul(PRECISION).div(BASIS_POINTS_DIVISOR);
}

export function roundToTwoDecimals(n) {
  return Math.round(n * 100) / 100;
}

export function sumBigNumbers(...args) {
  return args.filter((value) => !isNaN(Number(value))).reduce((acc, value) => acc.add(value || 0), BigNumber.from(0));
}

export function removeTrailingZeros(amount: string | number) {
  const amountWithoutZeros = Number(amount);
  if (!amountWithoutZeros) return amount;
  return amountWithoutZeros;
}
