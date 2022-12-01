import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type TokenPriceData = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type TokenPricesMap = {
  [address: string]: TokenPriceData | undefined;
};

export type TokenBalancesMap = {
  [address: string]: BigNumber | undefined;
};

export type TokenConfigsMap = {
  [address: string]: Token | undefined;
};

export type TokenPricesData = {
  tokenPrices: TokenPricesMap;
};

export type TokenBalancesData = {
  tokenBalances: TokenBalancesMap;
};

export type TokenConfigsData = {
  tokenConfigs: TokenConfigsMap;
};

export type TokenTotalSupplyData = {
  totalSupply: {
    [address: string]: BigNumber;
  };
};

export type TokenAllowanceData = {
  tokenAllowance: {
    [address: string]: BigNumber;
  };
};

export type TokensData = TokenConfigsData & TokenBalancesData & TokenPricesData;
