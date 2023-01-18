import { InfoTokens, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";
import { TokenAllowancesData, TokenData, TokensData } from "./types";

export function getTokenData(tokensData: TokensData, address?: string) {
  if (!address) return undefined;

  return tokensData[address];
}

export function getTokenAllowance(allowanceData: TokenAllowancesData, address?: string) {
  if (!address) return undefined;

  return allowanceData[address];
}

export function needTokenApprove(tokenAllowanceData: TokenAllowancesData, tokenAddress?: string, amount?: BigNumber) {
  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  if (!allowance || !amount) return false;

  return amount.gt(allowance);
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToInfoTokens(tokensData: TokensData): InfoTokens {
  const infoTokens = Object.keys(tokensData).reduce((acc, address) => {
    const tokenData = getTokenData(tokensData, address)!;

    acc[address] = adaptToTokenInfo(tokenData);

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToTokenInfo(tokenData: TokenData): TokenInfo {
  return {
    ...tokenData,
    minPrice: tokenData.prices?.minPrice,
    maxPrice: tokenData.prices?.maxPrice,
  };
}
