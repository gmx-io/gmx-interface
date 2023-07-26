import { TokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

export type PnlFactorType = "FOR_DEPOSITS" | "FOR_WITHDRAWALS" | "FOR_TRADERS";

export type Market = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  isSameCollaterals: boolean;
  isSpotOnly: boolean;
  name: string;
  data: string;
};

export type MarketPoolTokens = {
  longToken: TokenData;
  shortToken: TokenData;
  indexToken: TokenData;
};

export type MarketInfo = Market & {
  isDisabled: boolean;

  longToken: TokenData;
  shortToken: TokenData;
  indexToken: TokenData;

  longPoolAmount: BigNumber;
  shortPoolAmount: BigNumber;

  maxLongPoolAmount: BigNumber;
  maxShortPoolAmount: BigNumber;

  longPoolAmountAdjustment: BigNumber;
  shortPoolAmountAdjustment: BigNumber;

  poolValueMax: BigNumber;
  poolValueMin: BigNumber;

  reserveFactorLong: BigNumber;
  reserveFactorShort: BigNumber;

  openInterestReserveFactorLong: BigNumber;
  openInterestReserveFactorShort: BigNumber;

  borrowingFactorLong: BigNumber;
  borrowingFactorShort: BigNumber;
  borrowingExponentFactorLong: BigNumber;
  borrowingExponentFactorShort: BigNumber;

  fundingFactor: BigNumber;
  fundingExponentFactor: BigNumber;

  totalBorrowingFees: BigNumber;

  positionImpactPoolAmount: BigNumber;

  minCollateralFactor: BigNumber;
  minCollateralFactorForOpenInterestLong: BigNumber;
  minCollateralFactorForOpenInterestShort: BigNumber;

  swapImpactPoolAmountLong: BigNumber;
  swapImpactPoolAmountShort: BigNumber;

  maxPnlFactorForTradersLong: BigNumber;
  maxPnlFactorForTradersShort: BigNumber;

  pnlLongMin: BigNumber;
  pnlLongMax: BigNumber;
  pnlShortMin: BigNumber;
  pnlShortMax: BigNumber;

  netPnlMin: BigNumber;
  netPnlMax: BigNumber;

  claimableFundingAmountLong?: BigNumber;
  claimableFundingAmountShort?: BigNumber;

  longInterestUsd: BigNumber;
  shortInterestUsd: BigNumber;
  longInterestInTokens: BigNumber;
  shortInterestInTokens: BigNumber;

  positionFeeFactorForPositiveImpact: BigNumber;
  positionFeeFactorForNegativeImpact: BigNumber;
  positionImpactFactorPositive: BigNumber;
  positionImpactFactorNegative: BigNumber;
  maxPositionImpactFactorPositive: BigNumber;
  maxPositionImpactFactorNegative: BigNumber;
  maxPositionImpactFactorForLiquidations: BigNumber;
  positionImpactExponentFactor: BigNumber;

  swapFeeFactorForPositiveImpact: BigNumber;
  swapFeeFactorForNegativeImpact: BigNumber;
  swapImpactFactorPositive: BigNumber;
  swapImpactFactorNegative: BigNumber;
  swapImpactExponentFactor: BigNumber;

  borrowingFactorPerSecondForLongs: BigNumber;
  borrowingFactorPerSecondForShorts: BigNumber;

  fundingFactorPerSecond: BigNumber;
  longsPayShorts: boolean;

  virtualPoolAmountForLongToken: BigNumber;
  virtualPoolAmountForShortToken: BigNumber;
  virtualInventoryForPositions: BigNumber;

  virtualMarketId?: string;
  virtualLongTokenId?: string;
  virtualShortTokenId?: string;
};

export type MarketsData = {
  [marketTokenAddress: string]: Market;
};

export type MarketsInfoData = {
  [marketAddress: string]: MarketInfo;
};

export type MarketTokensAPRData = {
  [marketTokenAddress: string]: BigNumber;
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
