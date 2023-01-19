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

  totalBorrowingLong: BigNumber;
  totalBorrowingShort: BigNumber;

  cummulativeBorrowingFactorLong: BigNumber;
  cummulativeBorrowingFactorShort: BigNumber;

  positionImpactPoolAmount: BigNumber;

  netPnlMax: BigNumber;
  netPnlMin: BigNumber;

  pnlLongMax: BigNumber;
  pnlLongMin: BigNumber;
  pnlShortMax: BigNumber;
  pnlShortMin: BigNumber;
};

export type RawContractDeposit = {
  addresses: {
    account: string;
    receiver: string;
    callbackContract: string;
    market: string;
  };
  numbers: {
    longTokenAmount: BigNumber;
    shortTokenAmount: BigNumber;
    minMarketTokens: BigNumber;
    updatedAtBlock: BigNumber;
    executionFee: BigNumber;
    callbackGasLimit: BigNumber;
  };
  flags: {
    shouldUnwrapNativeToken: boolean;
  };
  data: string;
};

export type RawContractWithdrawal = {
  addresses: {
    account: string;
    receiver: string;
    callbackContract: string;
    market: string;
  };
  numbers: {
    marketTokenAmount: BigNumber;
    minLongTokenAmount: BigNumber;
    minShortTokenAmount: BigNumber;
    updatedAtBlock: BigNumber;
    executionFee: BigNumber;
    callbackGasLimit: BigNumber;
  };
  flags: {
    shouldUnwrapNativeToken: boolean;
  };
  data: string;
};

export type MarketsPoolsData = {
  [marketAddress: string]: PoolData;
};

export type OpenInterestData = {
  longInterestUsd: BigNumber;
  shortInterestUsd: BigNumber;
  longInterestInTokens: BigNumber;
  shortInterestInTokens: BigNumber;
};

export type MarketsOpenInterestData = {
  [marketAddress: string]: OpenInterestData;
};
