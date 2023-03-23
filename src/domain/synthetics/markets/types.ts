import { BigNumber } from "ethers";
import { TokenData } from "domain/synthetics/tokens";

export type Market = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  data: string;
  perp: string;
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

  swapImpactPoolAmountLong: BigNumber;
  swapImpactPoolAmountShort: BigNumber;

  maxPnlFactorLong: BigNumber;
  maxPnlFactorShort: BigNumber;

  maxPnlFactorForWithdrawalsLong: BigNumber;
  maxPnlFactorForWithdrawalsShort: BigNumber;

  netPnlMax: BigNumber;
  netPnlMin: BigNumber;

  pnlLongMax: BigNumber;
  pnlLongMin: BigNumber;
  pnlShortMax: BigNumber;
  pnlShortMin: BigNumber;

  claimableFundingAmountLong?: BigNumber;
  claimableFundingAmountShort?: BigNumber;
};

export type MarketFeesConfig = {
  positionFeeFactor: BigNumber;
  positionImpactFactorPositive: BigNumber;
  positionImpactFactorNegative: BigNumber;
  maxPositionImpactFactorPositive: BigNumber;
  maxPositionImpactFactorNegative: BigNumber;
  maxPositionImpactFactorForLiquidations: BigNumber;
  positionImpactExponentFactor: BigNumber;

  swapFeeFactor: BigNumber;
  swapImpactFactorPositive: BigNumber;
  swapImpactFactorNegative: BigNumber;
  swapImpactExponentFactor: BigNumber;

  borrowingFactorPerSecondForLongs: BigNumber;
  borrowingFactorPerSecondForShorts: BigNumber;

  fundingPerSecond: BigNumber;
  longsPayShorts: boolean;
  fundingAmountPerSize_LongCollateral_LongPosition: BigNumber;
  fundingAmountPerSize_LongCollateral_ShortPosition: BigNumber;
  fundingAmountPerSize_ShortCollateral_LongPosition: BigNumber;
  fundingAmountPerSize_ShortCollateral_ShortPosition: BigNumber;
};

export type OpenInterestData = {
  longInterestUsd: BigNumber;
  shortInterestUsd: BigNumber;
  longInterestInTokens: BigNumber;
  shortInterestInTokens: BigNumber;
};

export type MarketPoolTokens = {
  longToken: TokenData;
  shortToken: TokenData;
  indexToken: TokenData;
};

export type MarketInfo = Market & MarketPoolTokens & MarketFeesConfig & PoolData & OpenInterestData;

export type MarketsInfoData = {
  [marketAddress: string]: MarketInfo;
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

export type ContractMarketPrices = {
  indexTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
  longTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
  shortTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
};

export type MarketsPoolsData = {
  [marketAddress: string]: PoolData;
};

export type MarketsOpenInterestData = {
  [marketAddress: string]: OpenInterestData;
};
