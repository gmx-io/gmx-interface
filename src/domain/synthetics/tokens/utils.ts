import { InfoTokens, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";
import { convertToTokenAmount, convertToUsd } from "./amountUtils";
import { TokenAllowancesData, TokenData, TokensData } from "./types";

export function getTokenData(tokensData: TokensData, address?: string) {
  if (!address) return undefined;

  return tokensData[address];
}

export function getUsdFromTokenAmount(
  tokensData: TokensData,
  address: string | undefined,
  amount: BigNumber | undefined,
  priceType: "maxPrice" | "minPrice"
) {
  const tokenData = getTokenData(tokensData, address);

  const prices = tokenData?.prices;

  if (!tokenData || !prices || !amount) {
    return undefined;
  }

  return convertToUsd(amount, tokenData.decimals, priceType === "maxPrice" ? prices.maxPrice : prices.minPrice);
}

export function getTokenAmountFromUsd(
  tokensData: TokensData,
  address: string | undefined,
  usdAmount: BigNumber | undefined,
  priceType: "maxPrice" | "minPrice"
) {
  const tokenData = getTokenData(tokensData, address);

  const prices = tokenData?.prices;

  if (!tokenData || !prices || !usdAmount) {
    return undefined;
  }

  return convertToTokenAmount(
    usdAmount,
    tokenData.decimals,
    priceType === "maxPrice" ? prices.maxPrice : prices.minPrice
  );
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
