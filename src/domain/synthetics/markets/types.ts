import { BigNumber } from "ethers";
import { TokenData } from "domain/synthetics/tokens";

export enum MarketPoolType {
  Long = "Long",
  Short = "Short",
}

export type Market = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  data: string;
  perp: string;
};

export type MarketsData = {
  [marketTokenAddress: string]: Market;
};

export type MarketTokenData = TokenData & {
  totalSupply?: BigNumber;
};

export type MarketTokensData = {
  [marketAddress: string]: MarketTokenData;
};

export type MarketPoolData = {
  longPoolAmount: BigNumber;
  shortPoolAmount: BigNumber;
};

export type MarketsPoolsData = {
  [marketAddress: string]: MarketPoolData;
};

export type MarketOpenInterest = {
  longInterest: BigNumber;
  shortInterest: BigNumber;
};

export type OpenInterestData = {
  [marketAddress: string]: MarketOpenInterest;
};
