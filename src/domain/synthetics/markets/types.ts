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

export type PoolData = {
  longPoolAmount: BigNumber;
  shortPoolAmount: BigNumber;
  reserveFactorLong: BigNumber;
  reserveFactorShort: BigNumber;
};

export type MarketsPoolsData = {
  [marketAddress: string]: PoolData;
};

export type OpenInterestData = {
  longInterest: BigNumber;
  shortInterest: BigNumber;
};

export type MarketsOpenInterestData = {
  [marketAddress: string]: OpenInterestData;
};
