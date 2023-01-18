import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { TokenPrices } from "./types";

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
