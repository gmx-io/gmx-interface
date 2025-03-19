import { BigNumberish, ethers } from "ethers";

import { USD_DECIMALS } from "config/factors";
import { getPlusOrMinusSymbol } from "lib/utils";
import { bigMath } from "sdk/utils/bigmath";

import {
  bigintToNumber,
  calculateDisplayDecimals,
  getLimitedDisplay,
  limitDecimals,
  padDecimals,
  PERCENT_PRECISION_DECIMALS,
  PRECISION,
  roundBigNumberWithDecimals,
  trimZeroDecimals,
} from ".";

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
  showZero = false,
  toExponential = true
): string {
  if (amount === undefined) return "-";

  if (amount === 0n) {
    if (showZero === true) {
      if (tokenSymbol) {
        return `0.0000 ${tokenSymbol}`;
      }
      return "0.0000";
    }

    return "-";
  }

  const absAmount = bigMath.abs(amount);
  const absAmountFloat = bigintToNumber(absAmount, tokenDecimals);

  let value = "";

  if (absAmountFloat >= 1) value = formatAmount(amount, tokenDecimals, 4, true);
  else if (absAmountFloat >= 0.1) value = formatAmount(amount, tokenDecimals, 5, true);
  else if (absAmountFloat >= 0.01) value = formatAmount(amount, tokenDecimals, 6, true);
  else if (absAmountFloat >= 0.001) value = formatAmount(amount, tokenDecimals, 7, true);
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

export function formatBalanceAmountWithUsd(
  amount: bigint,
  amountUsd: bigint,
  tokenDecimals: number,
  tokenSymbol?: string,
  showZero = false
) {
  if (showZero === false && amount === 0n) {
    return "-";
  }

  const value = formatBalanceAmount(amount, tokenDecimals, tokenSymbol, showZero);

  const usd = formatUsd(amountUsd);

  // Regular space
  return `${value} (${usd})`;
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
  const amountBigInt = roundBigNumberWithDecimals(BigInt(amount) * BigInt(visualMultiplier ?? 1), {
    displayDecimals,
    tokenDecimals,
  });
  let amountStr = ethers.formatUnits(amountBigInt, tokenDecimals);
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