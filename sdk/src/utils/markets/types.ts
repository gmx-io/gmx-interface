import type { TokenData } from "../tokens/types";

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
    minCollateralFactorForLiquidation: bigint;
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

    positionFeeFactorForBalanceWasImproved: bigint;
    positionFeeFactorForBalanceWasNotImproved: bigint;
    positionImpactFactorPositive: bigint;
    positionImpactFactorNegative: bigint;
    maxPositionImpactFactorPositive: bigint;
    maxPositionImpactFactorNegative: bigint;
    maxPositionImpactFactorForLiquidations: bigint;
    maxLendableImpactFactor: bigint;
    maxLendableImpactFactorForWithdrawals: bigint;
    maxLendableImpactUsd: bigint;
    lentPositionImpactPoolAmount: bigint;
    positionImpactExponentFactorPositive: bigint;
    positionImpactExponentFactorNegative: bigint;
    useOpenInterestInTokensForBalance: boolean;

    swapFeeFactorForBalanceWasImproved: bigint;
    swapFeeFactorForBalanceWasNotImproved: bigint;
    atomicSwapFeeFactor: bigint;
    swapImpactFactorPositive: bigint;
    swapImpactFactorNegative: bigint;
    swapImpactExponentFactor: bigint;
    withdrawalFeeFactorBalanceWasImproved?: bigint;
    withdrawalFeeFactorBalanceWasNotImproved?: bigint;

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

export type RawOpenInterestValues = {
  longInterestUsingLongToken: bigint;
  longInterestUsingShortToken: bigint;
  shortInterestUsingLongToken: bigint;
  shortInterestUsingShortToken: bigint;
  longInterestInTokensUsingLongToken: bigint;
  longInterestInTokensUsingShortToken: bigint;
  shortInterestInTokensUsingLongToken: bigint;
  shortInterestInTokensUsingShortToken: bigint;
};

/**
 * Updates frequently
 */
export type MarketValues = Pick<
  MarketInfo,
  | "longInterestUsd"
  | "shortInterestUsd"
  | "longInterestInTokens"
  | "shortInterestInTokens"
  | "longPoolAmount"
  | "shortPoolAmount"
  | "poolValueMin"
  | "poolValueMax"
  | "totalBorrowingFees"
  | "positionImpactPoolAmount"
  | "swapImpactPoolAmountLong"
  | "swapImpactPoolAmountShort"
  | "borrowingFactorPerSecondForLongs"
  | "borrowingFactorPerSecondForShorts"
  | "fundingFactorPerSecond"
  | "longsPayShorts"
  | "virtualPoolAmountForLongToken"
  | "virtualPoolAmountForShortToken"
  | "virtualInventoryForPositions"
>;

/**
 * Updates seldom
 */
export type MarketConfig = Pick<
  MarketInfo,
  | "isDisabled"
  | "maxLongPoolUsdForDeposit"
  | "maxShortPoolUsdForDeposit"
  | "maxLongPoolAmount"
  | "maxShortPoolAmount"
  | "reserveFactorLong"
  | "reserveFactorShort"
  | "openInterestReserveFactorLong"
  | "openInterestReserveFactorShort"
  | "maxOpenInterestLong"
  | "maxOpenInterestShort"
  | "minPositionImpactPoolAmount"
  | "positionImpactPoolDistributionRate"
  | "borrowingFactorLong"
  | "borrowingFactorShort"
  | "borrowingExponentFactorLong"
  | "borrowingExponentFactorShort"
  | "fundingFactor"
  | "fundingExponentFactor"
  | "fundingIncreaseFactorPerSecond"
  | "fundingDecreaseFactorPerSecond"
  | "thresholdForDecreaseFunding"
  | "thresholdForStableFunding"
  | "minFundingFactorPerSecond"
  | "maxFundingFactorPerSecond"
  | "maxPnlFactorForTradersLong"
  | "maxPnlFactorForTradersShort"
  | "minCollateralFactor"
  | "minCollateralFactorForLiquidation"
  | "minCollateralFactorForOpenInterestLong"
  | "minCollateralFactorForOpenInterestShort"
  | "positionFeeFactorForBalanceWasImproved"
  | "positionFeeFactorForBalanceWasNotImproved"
  | "positionImpactFactorPositive"
  | "positionImpactFactorNegative"
  | "maxPositionImpactFactorPositive"
  | "maxPositionImpactFactorNegative"
  | "maxPositionImpactFactorForLiquidations"
  | "maxLendableImpactFactor"
  | "maxLendableImpactFactorForWithdrawals"
  | "maxLendableImpactUsd"
  | "lentPositionImpactPoolAmount"
  | "positionImpactExponentFactorPositive"
  | "positionImpactExponentFactorNegative"
  | "swapFeeFactorForBalanceWasImproved"
  | "swapFeeFactorForBalanceWasNotImproved"
  | "swapImpactFactorPositive"
  | "swapImpactFactorNegative"
  | "swapImpactExponentFactor"
  | "atomicSwapFeeFactor"
  | "withdrawalFeeFactorBalanceWasImproved"
  | "withdrawalFeeFactorBalanceWasNotImproved"
  | "virtualMarketId"
  | "virtualLongTokenId"
  | "virtualShortTokenId"
>;

export type MarketsData = {
  [marketTokenAddress: string]: Market;
};

export type RawMarketInfo = Omit<
  MarketInfo,
  "longToken" | "shortToken" | "indexToken" | "claimableFundingAmountLong" | "claimableFundingAmountShort"
>;

export type RawMarketsInfoData = {
  [marketAddress: string]: RawMarketInfo;
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

export type MarketTicker = {
  symbol: string;
  marketTokenAddress: string;
  markPrice: bigint;
  high24h: bigint;
  low24h: bigint;
  open24h: bigint;
  close24h: bigint;
  priceChange24h: bigint;
  priceChangePercent24hBps: bigint;
  openInterestLong: bigint;
  openInterestShort: bigint;
  availableLiquidityLong: bigint;
  availableLiquidityShort: bigint;
  poolAmountLongUsd: bigint;
  poolAmountShortUsd: bigint;
  fundingRateLong: bigint;
  fundingRateShort: bigint;
  borrowingRateLong: bigint;
  borrowingRateShort: bigint;
  netRateLong: bigint;
  netRateShort: bigint;
};

export type LeverageTier = {
  maxLeverage: bigint;
  minCollateralFactor: bigint;
  maxPositionSize: bigint | undefined;
};

export type MarketWithTiers = {
  symbol: string;
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  isListed: boolean;
  listingDate: number | undefined;
  isSpotOnly: boolean;
  leverageTiers: LeverageTier[];
  minPositionSizeUsd: bigint;
  minCollateralUsd: bigint;
};
