import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type TokenPrices = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type TokenData = Token & {
  prices: TokenPrices;
  balance?: BigNumber;
  totalSupply?: BigNumber;
};

export type TokensRatio = {
  ratio: BigNumber;
  largestAddress: string;
  smallestAddress: string;
};

export type TokensAllowanceData = {
  [tokenAddress: string]: BigNumber;
};

export type TokenBalancesData = {
  [tokenAddress: string]: BigNumber;
};

export type TokenPricesData = {
  [address: string]: TokenPrices;
};

export type TokensData = {
  [address: string]: TokenData;
};
