import type { Token } from "domain/tokens";

export type { TokenData, TokensData } from "sdk/types/tokens";

export type TokenPrices = {
  minPrice: bigint;
  maxPrice: bigint;
};

export type TokensRatio = {
  ratio: bigint;
  largestToken: Token;
  smallestToken: Token;
};

export type TokenToSpendParams = {
  tokenAddress: string;
  amount: bigint;
  allowanceData: TokensAllowanceData | undefined;
  isAllowanceLoaded: boolean | undefined;
};

export type TokenBalancesData = {
  [tokenAddress: string]: bigint;
};

export type TokenPricesData = {
  [address: string]: TokenPrices;
};

export type TokensAllowanceData = {
  [tokenAddress: string]: bigint;
};

export type BalancesDataResult = {
  balancesData?: TokenBalancesData;
  error?: Error;
};
