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
  largestToken: Token;
  smallestToken: Token;
};

export type TokenBalancesData = {
  [tokenAddress: string]: BigNumber;
};

export type TokenPricesData = {
  [address: string]: TokenPrices;
};

export type TokensAllowanceData = {
  [tokenAddress: string]: BigNumber;
};

export type TokensData = {
  [address: string]: TokenData;
};
