import { BigNumber, BigNumberish, ethers } from "ethers";
import { USD_DECIMALS } from "./legacy";

export function bigNumberify(n: BigNumberish) {
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
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals);
  }
  if (useCommas) {
    return numberWithCommas(amountStr);
  }
  return amountStr;
};

export const formatKeyAmount = (
  map: any,
  key: string,
  tokenDecimals: number,
  displayDecimals: number,
  useCommas?: boolean
) => {
  if (!map || !map[key]) {
    return "...";
  }

  return formatAmount(map[key], tokenDecimals, displayDecimals, useCommas);
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
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export function formatUsd(usd?: BigNumber, opts: { fallbackToZero?: boolean } = {}) {
  const { fallbackToZero = false } = opts;

  if (!usd) {
    if (fallbackToZero) {
      usd = BigNumber.from(0);
    } else {
      return undefined;
    }
  }

  return `$${formatAmount(usd, USD_DECIMALS, 2, true)}`;
}

export function formatTokenAmount(
  amount?: BigNumber,
  tokenDecimals?: number,
  symbol?: string,
  opts: {
    showAllSignificant?: boolean;
    displayDecimals?: number;
    fallbackToZero?: boolean;
  } = {}
) {
  const { displayDecimals = 4, showAllSignificant = false, fallbackToZero = false } = opts;

  const symbolStr = symbol ? ` ${symbol}` : "";

  if (!amount || !tokenDecimals) {
    if (fallbackToZero) {
      amount = BigNumber.from(0);
      tokenDecimals = displayDecimals;
    } else {
      return undefined;
    }
  }

  const formattedAmount = showAllSignificant
    ? formatAmountFree(amount, tokenDecimals, tokenDecimals)
    : formatAmount(amount, tokenDecimals, displayDecimals);

  return `${formattedAmount}${symbolStr}`;
}

export function formatTokenAmountWithUsd(
  tokenAmount?: BigNumber,
  usdAmount?: BigNumber,
  tokenSymbol?: string,
  tokenDecimals?: number,
  opts: {
    fallbackToZero?: boolean;
    displayDecimals?: number;
  } = {}
) {
  if (!tokenAmount || !usdAmount || !tokenSymbol || !tokenDecimals) {
    if (!opts.fallbackToZero) {
      return undefined;
    }
  }

  return `${formatTokenAmount(tokenAmount, tokenDecimals, tokenSymbol, opts)} (${formatUsd(usdAmount, opts)})`;
}

export const parseValue = (value: string, tokenDecimals: number) => {
  const pValue = parseFloat(value);

  if (isNaN(pValue)) {
    return undefined;
  }

  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.utils.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};

export function numberWithCommas(x: BigNumberish) {
  if (!x) {
    return "...";
  }

  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function roundUpDivision(a: BigNumber, b: BigNumber) {
  if (a.lt(0)) {
    return a.sub(b).add(1).div(b);
  }

  return a.add(b).sub(1).div(b);
}
