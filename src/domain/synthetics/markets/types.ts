import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { TokenPrices } from "domain/synthetics/tokens";

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

export type MarketTokenData = Token & {
  totalSupply?: BigNumber;
  prices?: TokenPrices;
  balance?: BigNumber;
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
