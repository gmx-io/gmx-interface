import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type TokenPrices = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type TokenData = Token & {
  balance?: BigNumber;
  prices?: TokenPrices;
};

export type TokenAllowancesData = {
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
