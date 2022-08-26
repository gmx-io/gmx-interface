import { ethers } from "ethers";
import { bigNumberify, limitDecimals, numberWithCommas, padDecimals, trimZeroDecimals } from "../numbers";

export const formatAmount = (amount, tokenDecimals, displayDecimals, useCommas, defaultValue) => {
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

export const formatAmountFree = (amount, tokenDecimals, displayDecimals) => {
  if (!amount) {
    return "...";
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export const formatKeyAmount = (map, key, tokenDecimals, displayDecimals, useCommas) => {
  if (!map || !map[key]) {
    return "...";
  }

  return formatAmount(map[key], tokenDecimals, displayDecimals, useCommas);
};

export const formatArrayAmount = (arr, index, tokenDecimals, displayDecimals, useCommas) => {
  if (!arr || !arr[index]) {
    return "...";
  }

  return formatAmount(arr[index], tokenDecimals, displayDecimals, useCommas);
};

export const parseValue = (value, tokenDecimals) => {
  const pValue = parseFloat(value);
  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.utils.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};
