import { InfoTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { TokenBalancesData, TokenConfigsData, TokenPricesData } from "./types";

export function getTokenPriceData(data: TokenPricesData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.tokenPrices[tokenAddress];
}

export function getTokenPrice(data: TokenPricesData, tokenAddress?: string, useMaxPrice?: boolean) {
  const priceData = getTokenPriceData(data, tokenAddress);

  if (!priceData) return undefined;

  return useMaxPrice ? priceData.maxPrice : priceData.minPrice;
}

export function getTokenConfig(data: TokenConfigsData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.tokenConfigs[tokenAddress];
}

export function getUsdFromTokenAmount(
  data: TokenPricesData & TokenConfigsData,
  tokenAddress?: string,
  amount?: BigNumber,
  useMaxPrice?: boolean
) {
  const tokenConfig = getTokenConfig(data, tokenAddress);
  const price = getTokenPrice(data, tokenAddress, useMaxPrice);

  if (!tokenConfig || !price || !amount) {
    return undefined;
  }

  return convertToUsdByPrice(amount, tokenConfig.decimals, price);
}

export function getTokenAmountFromUsd(
  data: TokenConfigsData & TokenPricesData,
  tokenAddress?: string,
  usdAmount?: BigNumber,
  useMaxPrice?: boolean
) {
  const tokenConfig = getTokenConfig(data, tokenAddress);
  const price = getTokenPrice(data, tokenAddress, useMaxPrice);

  if (!tokenConfig || !price || !usdAmount) {
    return undefined;
  }

  return convertFromUsdByPrice(usdAmount, tokenConfig.decimals, price);
}

export function adaptToInfoTokens(data: TokenConfigsData & TokenPricesData & TokenBalancesData): InfoTokens {
  const infoTokens = Object.keys(data.tokenConfigs).reduce((acc, address) => {
    const tokenConfigData = getTokenConfig(data, address);

    if (!tokenConfigData) return acc;

    const balance = getTokenBalance(data, address) || BigNumber.from(0);
    const priceData = getTokenPriceData(data, address) || ({} as TokenPricesData);

    acc[address] = {
      ...tokenConfigData,
      ...priceData,
      balance,
    };

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

export function getTokenBalance(data: TokenBalancesData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.tokenBalances[tokenAddress];
}

export function convertFromUsdByPrice(usdAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  if (price.lte(0)) return undefined;

  return usdAmount.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsdByPrice(tokenAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}
