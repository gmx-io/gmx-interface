import { BigNumber, BigNumberish, ethers } from "ethers";

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

// // x^y = 2^{log_2{x} * y}
// function pow(UD60x18 x, UD60x18 y) pure returns (UD60x18 result) {
//   uint256 xUint = unwrap(x);
//   uint256 yUint = unwrap(y);

//   if (xUint == 0) {
//       result = yUint == 0 ? UNIT : ZERO;
//   } else {
//       if (yUint == uUNIT) {
//           result = x;
//       } else {
//           result = exp2(mul(log2(x), y));
//       }
//   }
// }

// function msb(n) {
//   // Below steps set bits after
//   // MSB (including MSB)

//   // Suppose n is 273 (binary
//   // is 100010001). It does following
//   // 100010001 | 010001000 = 110011001
//   n |= n >> 1;

//   // This makes sure 4 bits
//   // (From MSB and including MSB)
//   // are set. It does following
//   // 110011001 | 001100110 = 111111111
//   n |= n >> 2;

//   n |= n >> 4;
//   n |= n >> 8;
//   n |= n >> 16;

//   // Increment n by 1 so that
//   // there is only one set bit
//   // which is just before original
//   // MSB. n now becomes 1000000000
//   n = n + 1;

//   // Return original MSB after shifting.
//   // n now becomes 100000000
//   return n >> 1;
// }
