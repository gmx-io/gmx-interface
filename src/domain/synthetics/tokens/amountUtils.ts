import { BigNumber } from "ethers";
import { expandDecimals, formatAmount, formatAmountFree } from "lib/numbers";
import { TokenPrices } from "./types";
import { USD_DECIMALS } from "lib/legacy";

export function convertToTokenAmount(usd: BigNumber, tokenDecimals: number, price: BigNumber) {
  if (price.lte(0)) return undefined;

  return usd.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsd(tokenAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
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

export function formatTokenAmount(
  amount?: BigNumber,
  tokenDecimals?: number,
  symbol?: string,
  showAllSignificant?: boolean
) {
  if (!amount || !tokenDecimals) return undefined;

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

export function formatTokenAmountWithUsd(
  tokenAmount?: BigNumber,
  usdAmount?: BigNumber,
  tokenSymbol?: string,
  tokenDecimals?: number
) {
  if (!tokenAmount || !usdAmount || !tokenSymbol || !tokenDecimals) {
    return undefined;
  }

  return `${formatTokenAmount(tokenAmount, tokenDecimals)} ${tokenSymbol} (${formatUsd(usdAmount)})`;
}

export function formatUsd(usd?: BigNumber) {
  if (!usd) return undefined;

  return `$${formatAmount(usd || BigNumber.from(0), USD_DECIMALS, 2, true)}`;
}
