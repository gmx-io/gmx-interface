import { TokenData } from "./tokens";

export type PnlFactorType = "FOR_DEPOSITS" | "FOR_WITHDRAWALS" | "FOR_TRADERS";

export type MarketSdkConfig = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isListed: boolean;
};

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

export type MarketInfo = Market &
  MarketPoolTokens & {
    isDisabled: boolean;

    longPoolAmount: bigint;
    shortPoolAmount: bigint;

    maxLongPoolAmount: bigint;
    maxShortPoolAmount: bigint;
    maxLongPoolUsdForDeposit: bigint;
    maxShortPoolUsdForDeposit: bigint;

    longPoolAmountAdjustment: bigint;
    shortPoolAmountAdjustment: bigint;

    poolValueMax: bigint;
    poolValueMin: bigint;

    reserveFactorLong: bigint;
    reserveFactorShort: bigint;

    openInterestReserveFactorLong: bigint;
    openInterestReserveFactorShort: bigint;

    maxOpenInterestLong: bigint;
    maxOpenInterestShort: bigint;

    borrowingFactorLong: bigint;
    borrowingFactorShort: bigint;
    borrowingExponentFactorLong: bigint;
    borrowingExponentFactorShort: bigint;

    fundingFactor: bigint;
    fundingExponentFactor: bigint;
    fundingIncreaseFactorPerSecond: bigint;
    fundingDecreaseFactorPerSecond: bigint;
    thresholdForStableFunding: bigint;
    thresholdForDecreaseFunding: bigint;
    minFundingFactorPerSecond: bigint;
    maxFundingFactorPerSecond: bigint;

    totalBorrowingFees: bigint;

    positionImpactPoolAmount: bigint;
    minPositionImpactPoolAmount: bigint;
    positionImpactPoolDistributionRate: bigint;

    minCollateralFactor: bigint;
    minCollateralFactorForOpenInterestLong: bigint;
    minCollateralFactorForOpenInterestShort: bigint;

    swapImpactPoolAmountLong: bigint;
    swapImpactPoolAmountShort: bigint;

    maxPnlFactorForTradersLong: bigint;
    maxPnlFactorForTradersShort: bigint;

    claimableFundingAmountLong?: bigint;
    claimableFundingAmountShort?: bigint;

    longInterestUsd: bigint;
    shortInterestUsd: bigint;
    longInterestInTokens: bigint;
    shortInterestInTokens: bigint;

    positionFeeFactorForPositiveImpact: bigint;
    positionFeeFactorForNegativeImpact: bigint;
    positionImpactFactorPositive: bigint;
    positionImpactFactorNegative: bigint;
    maxPositionImpactFactorPositive: bigint;
    maxPositionImpactFactorNegative: bigint;
    maxPositionImpactFactorForLiquidations: bigint;
    positionImpactExponentFactor: bigint;

    swapFeeFactorForPositiveImpact: bigint;
    swapFeeFactorForNegativeImpact: bigint;
    swapImpactFactorPositive: bigint;
    swapImpactFactorNegative: bigint;
    swapImpactExponentFactor: bigint;

    borrowingFactorPerSecondForLongs: bigint;
    borrowingFactorPerSecondForShorts: bigint;

    fundingFactorPerSecond: bigint;
    longsPayShorts: boolean;

    virtualPoolAmountForLongToken: bigint;
    virtualPoolAmountForShortToken: bigint;
    virtualInventoryForPositions: bigint;

    virtualMarketId: string;
    virtualLongTokenId: string;
    virtualShortTokenId: string;
  };

export type MarketsData = {
  [marketTokenAddress: string]: Market;
};

export type MarketsInfoData = {
  [marketAddress: string]: MarketInfo;
};

export type MarketTokensAPRData = {
  [marketTokenAddress: string]: bigint;
};

export type UserEarningsData = {
  byMarketAddress: {
    [marketTokenAddress: string]: {
      total: bigint;
      recent: bigint;
    };
  };

  allMarkets: {
    total: bigint;
    recent: bigint;
    expected365d: bigint;
  };
};

export type ContractMarketPrices = {
  indexTokenPrice: {
    min: bigint;
    max: bigint;
  };
  longTokenPrice: {
    min: bigint;
    max: bigint;
  };
  shortTokenPrice: {
    min: bigint;
    max: bigint;
  };
};

export type ClaimableFunding = {
  claimableFundingAmountLong: bigint;
  claimableFundingAmountShort: bigint;
};

export type ClaimableFundingData = {
  [marketAddress: string]: ClaimableFunding;
};
