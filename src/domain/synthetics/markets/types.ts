import { BigNumber } from "ethers";

export type MarketConfig = {
  marketTokenAddress: string;
  perp: string;
};

export type SyntheticsMarket = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  data: string;
};

export type MarketsData = {
  markets: {
    [marketKey: string]: SyntheticsMarket;
  };
};

export type MarketTokenPricesData = {
  marketTokenPrices: {
    [marketKey: string]: BigNumber;
  };
};

export type MarketPoolsData = {
  marketPools: {
    [marketAddress: string]: {
      [tokenAddress: string]: BigNumber;
    };
  };
};

export enum MarketPoolType {
  Long = "Long",
  Short = "Short",
}
