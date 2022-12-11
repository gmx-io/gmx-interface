import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type TokenPrices = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type TokenAllowancesData = {
  [tokenAddress: string]: BigNumber;
};

export type TokenBalancesData = {
  [tokenAddress: string]: BigNumber;
};

export type TokenData = Token & {
  balance?: BigNumber;
  prices?: TokenPrices;
};

export type TokensData = {
  [address: string]: TokenData;
};
