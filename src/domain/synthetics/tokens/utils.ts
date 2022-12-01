import { InfoTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import {
  TokenAllowanceData,
  TokenBalancesData,
  TokenConfigsData,
  TokenPricesData,
  TokensData,
  TokenTotalSupplyData,
} from "./types";

export function getTokenPriceData(data: TokenPricesData & TokenConfigsData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  const token = getTokenConfig(data, tokenAddress);

  if (token?.isStable)
    return {
      minPrice: expandDecimals(1, USD_DECIMALS),
      maxPrice: expandDecimals(1, USD_DECIMALS),
    };

  return data.tokenPrices[tokenAddress];
}

export function getTokenPrice(data: TokenPricesData & TokenConfigsData, tokenAddress?: string, useMaxPrice?: boolean) {
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

export function getTokenBalance(data: TokenBalancesData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.tokenBalances[tokenAddress];
}

export function getTokenTotalSupply(data: TokenTotalSupplyData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.totalSupply[tokenAddress];
}

export function getTokenAllowance(data: TokenAllowanceData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return data.tokenAllowance[tokenAddress];
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

export function getTokenData(data: TokensData, tokenAddress?: string) {
  const config = getTokenConfig(data, tokenAddress);
  const balance = getTokenBalance(data, tokenAddress);
  const priceData = getTokenPriceData(data, tokenAddress);

  return {
    ...config,
    ...priceData,
    balance,
  };
}

export function convertFromUsdByPrice(usdAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  if (price.lte(0)) return undefined;

  return usdAmount.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsdByPrice(tokenAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function formatTokenAmount(amount?: BigNumber, tokenDecimals?: number, showAllSignificant?: boolean) {
  if (!tokenDecimals || !amount) return formatAmount(BigNumber.from(0), 4, 4);

  if (showAllSignificant) return formatAmountFree(amount, tokenDecimals, tokenDecimals);

  return formatAmount(amount, tokenDecimals, 4);
}

export function formatUsdAmount(amount?: BigNumber) {
  return `$${formatAmount(amount || BigNumber.from(0), USD_DECIMALS, 2, true)}`;
}

export function formatTokenAmountWithUsd(
  tokenAmount?: BigNumber,
  usdAmount?: BigNumber,
  tokenSymbol?: string,
  tokenDecimals?: number
) {
  return `${formatTokenAmount(tokenAmount, tokenDecimals)} ${tokenSymbol} (${formatUsdAmount(usdAmount)})`;
}

// TODO
export const MOCK_GM_PRICE = parseValue("100", USD_DECIMALS)!;
