import { InfoTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountFree } from "lib/numbers";
import { TokenAllowancesData, TokensData } from "./types";

export function getTokenData(tokensData: TokensData, address?: string) {
  if (!address) return undefined;

  return tokensData[address];
}

export function getTokensDataArr(tokensData: TokensData) {
  return Object.keys(tokensData).map((address) => getTokenData(tokensData, address)!);
}

export function getUsdFromTokenAmount(tokensData: TokensData, address?: string, amount?: BigNumber, max?: boolean) {
  const tokenData = getTokenData(tokensData, address);

  const prices = tokenData?.prices;

  if (!tokenData || !prices || !amount) {
    return undefined;
  }

  return convertToUsdByPrice(amount, tokenData.decimals, max ? prices.maxPrice : prices.minPrice);
}

export function getTokenAmountFromUsd(tokensData: TokensData, address?: string, usdAmount?: BigNumber, max?: boolean) {
  const tokenData = getTokenData(tokensData, address);

  const prices = tokenData?.prices;

  if (!tokenData || !prices || !usdAmount) {
    return undefined;
  }

  return convertFromUsdByPrice(usdAmount, tokenData.decimals, max ? prices.maxPrice : prices.minPrice);
}

export function getTokenAllowance(allowanceData: TokenAllowancesData, address?: string) {
  if (!address) return undefined;

  return allowanceData[address];
}

export function needTokenApprove(tokenAllowanceData: TokenAllowancesData, tokenAddress: string, amount?: BigNumber) {
  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  if (!allowance || !amount) return false;

  return amount.gt(allowance);
}

/**
 * Used to adapt Synthetics tokens to InfoTokens where it's possible
 */
export function adaptToInfoTokens(tokensData: TokensData): InfoTokens {
  const infoTokens = Object.keys(tokensData).reduce((acc, address) => {
    const { prices, ...tokenData } = getTokenData(tokensData, address)!;

    acc[address] = {
      ...tokenData,
      minPrice: prices?.minPrice,
      maxPrice: prices?.maxPrice,
    };

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

export function convertFromUsdByPrice(usdAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  if (price.lte(0)) return undefined;

  return usdAmount.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsdByPrice(tokenAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function formatTokenAmount(
  amount?: BigNumber,
  tokenDecimals?: number,
  symbol?: string,
  showAllSignificant?: boolean
) {
  let formattedAmount;

  if (tokenDecimals && amount) {
    if (showAllSignificant) {
      formattedAmount = formatAmountFree(amount, tokenDecimals, tokenDecimals);
    } else {
      formattedAmount = formatAmount(amount, tokenDecimals, 4);
    }
  }

  if (!formattedAmount) {
    formattedAmount = formatAmount(BigNumber.from(0), 4, 4);
  }

  return `${formattedAmount}${symbol ? ` ${symbol}` : ""}`;
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
