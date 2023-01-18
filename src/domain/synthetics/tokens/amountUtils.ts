import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { TokenPrices } from "./types";

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
