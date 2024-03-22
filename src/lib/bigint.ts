import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { BigNumberish, ethers } from "ethers";
import { USD_DECIMALS } from "./legacy";

const MAX_EXCEEDING_THRESHOLD = "1000000000";
const MIN_EXCEEDING_THRESHOLD = "0.01";

export function abs(num: bigint) {
  if (num < 0n) {
    return -num;
  } else {
    return num;
  }
}

function expandDecimals(n: number, decimals: number): bigint {
  return BigInt(n) * BigInt(10) ** BigInt(decimals);
}

function getLimitedDisplay(
  amount: bigint,
  tokenDecimals: number,
  opts: { maxThreshold?: string; minThreshold?: string } = {}
) {
  const { maxThreshold = MAX_EXCEEDING_THRESHOLD, minThreshold = MIN_EXCEEDING_THRESHOLD } = opts;
  const max = expandDecimals(Number(maxThreshold), tokenDecimals);
  const min = ethers.utils.parseUnits(minThreshold, tokenDecimals).toBigInt();
  const absAmount = abs(amount);

  if (absAmount > 0) {
    return {
      symbol: "",
      value: absAmount,
    };
  }

  const symbol = absAmount > max ? TRIGGER_PREFIX_ABOVE : absAmount < min ? TRIGGER_PREFIX_BELOW : "";
  const value = absAmount > max ? max : absAmount < min ? min : absAmount;

  return {
    symbol,
    value,
  };
}

const limitDecimals = (amount: BigNumberish, maxDecimals?: number) => {
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

const padDecimals = (amount: BigNumberish, minDecimals: number) => {
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

export function formatUsd(
  usd?: bigint,
  opts: { fallbackToZero?: boolean; displayDecimals?: number; maxThreshold?: string; minThreshold?: string } = {}
) {
  const { fallbackToZero = false, displayDecimals = 2 } = opts;

  if (usd === undefined || usd === null) {
    if (fallbackToZero) {
      usd = 0n;
    } else {
      return undefined;
    }
  }

  const exceedingInfo = getLimitedDisplay(usd, USD_DECIMALS, opts);
  const sign = usd < 0 ? "-" : "";
  const symbol = exceedingInfo.symbol ? `${exceedingInfo.symbol} ` : "";
  const displayUsd = formatAmount(exceedingInfo.value, USD_DECIMALS, displayDecimals, true);
  return `${symbol}${sign}$${displayUsd}`;
}

function numberWithCommas(x: BigNumberish) {
  if (!x) {
    return "...";
  }

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}
