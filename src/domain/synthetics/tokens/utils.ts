import { InfoTokens, TokenInfo } from "domain/tokens";
import { BigNumber } from "ethers";
import { TokenAllowancesData, TokenData, TokenPrices, TokensData } from "./types";
import { expandDecimals } from "lib/numbers";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";

export function getTokenData(tokensData: TokensData, address: string | undefined, convertTo?: "wrapped" | "native") {
  if (!address) return undefined;

  const token = tokensData[address];

  if (convertTo === "wrapped" && token.isNative && token.wrappedAddress) {
    return tokensData[token.wrappedAddress];
  }

  if (convertTo === "native" && token.isWrapped) {
    return tokensData[NATIVE_TOKEN_ADDRESS];
  }

  return tokensData[address];
}

export function getTokenAllowance(allowanceData: TokenAllowancesData, address: string | undefined) {
  if (!address) return undefined;

  return allowanceData[address];
}

export function needTokenApprove(
  tokenAllowanceData: TokenAllowancesData,
  tokenAddress: string | undefined,
  amountToSpend: BigNumber | undefined
) {
  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  if (!allowance || !amountToSpend) return false;

  return amountToSpend.gt(allowance);
}

export function convertToTokenAmount(
  usd: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!usd || !tokenDecimals || !price?.gt(0)) return undefined;

  return usd.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsd(
  tokenAmount: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!tokenAmount || !tokenDecimals || !price) return undefined;

  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function getMidPrice(prices: TokenPrices | undefined) {
  if (!prices) return undefined;

  return prices.minPrice.add(prices.maxPrice).div(2);
}

export function parseOraclePrice(price: string, tokenDecimals: number, oracleDecimals: number) {
  return expandDecimals(price, tokenDecimals + oracleDecimals);
}

export function convertToContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.div(expandDecimals(1, tokenDecimals));
}

export function convertToContractPrices(prices: TokenPrices, tokenDecimals: number) {
  return {
    min: convertToContractPrice(prices.minPrice, tokenDecimals),
    max: convertToContractPrice(prices.maxPrice, tokenDecimals),
  };
}

export function parseContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.mul(expandDecimals(1, tokenDecimals));
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
