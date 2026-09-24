import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { TokenData } from '../token/types';

// MarketInfo

export interface Market {
  marketAddress: PublicKey;
  marketTokenAddress: PublicKey;
  indexTokenAddress: PublicKey;
  longTokenAddress: PublicKey;
  shortTokenAddress: PublicKey;
  isDisabled: boolean;
  isSingle: boolean;
  AutoDeleveragingEnabledForLong: boolean;
  AutoDeleveragingEnabledForShort: boolean;
  GtEnabled: boolean;
  isSpotOnly: boolean;
}

export interface MarketState {
  longPoolAmount: BN;
  shortPoolAmount: BN;
  openInterest: {
    long: BN;
    short: BN;
  };
  minCollateralFactor: BN;
  minCollateralFactorForLiquidation: BN;
  minCollateralFactorForOpenInterestMultiplierForLong: BN;
  minCollateralFactorForOpenInterestMultiplierForShort: BN;
  maxPnlFactorForLongTrader: BN;
  maxPnlFactorForShortTrader: BN;
  maxPnlFactorForLongAdl: BN;
  maxPnlFactorForShortAdl: BN;
  maxPnlFactorForLongDeposit: BN;
  maxPnlFactorForShortDeposit: BN;
  maxPnlFactorForLongWithdrawal: BN;
  maxPnlFactorForShortWithdrawal: BN;
  positionImpactDistributeFactor: BN;
  minPositionImpactPoolAmount: BN;
  swapFeeReceiverFactor: BN;
  swapFeeFactorForPositiveImpact: BN;
  swapFeeFactorForNegativeImpact: BN;
  borrowingFeeReceiverFactor: BN;
  borrowingFeeFactorForLong: BN;
  borrowingFeeFactorForShort: BN;
  borrowingFeeExponentForLong: BN;
  borrowingFeeExponentForShort: BN;
  fundingFeeFactor: BN;
  fundingFeeExponent: BN;
  fundingFeeMaxFactorPerSecond: BN;
  fundingFeeMinFactorPerSecond: BN;
  fundingFeeIncreaseFactorPerSecond: BN;
  fundingFeeDecreaseFactorPerSecond: BN;
  fundingFeeThresholdForStableFunding: BN;
  fundingFeeThresholdForDecreaseFunding: BN;
  orderFeeReceiverFactor: BN;
  orderFeeFactorForPositiveImpact: BN;
  orderFeeFactorForNegativeImpact: BN;
  reserveFactor: BN;
  openInterestReserveFactor: BN;
  maxPoolAmountForLongToken: BN;
  maxPoolAmountForShortToken: BN;
  maxPoolValueForDepositForLongToken: BN;
  maxPoolValueForDepositForShortToken: BN;
  maxOpenInterestForLong: BN;
  maxOpenInterestForShort: BN;
  minPnlFactorAfterLongAdl: BN;
  minPnlFactorAfterShortAdl: BN;
  minCollateralValue: BN;
  minPositionSizeUsd: BN;
  maxPositivePositionImpactFactor: BN;
  maxNegativePositionImpactFactor: BN;
  maxPositionImpactFactorForLiquidations: BN;
  positionImpactExponent: BN;
  positionImpactPositiveFactor: BN;
  positionImpactNegativeFactor: BN;
  swapImpactExponent: BN;
  swapImpactPositiveFactor: BN;
  swapImpactNegativeFactor: BN;

  primaryLongTokenAmount: BN;
  primaryShortTokenAmount: BN;
  swapImpactLongTokenAmount: BN;
  swapImpactShortTokenAmount: BN;
  claimableFeeLongTokenAmount: BN;
  claimableFeeShortTokenAmount: BN;
  openInterestForLongLongTokenAmount: BN;
  openInterestForLongShortTokenAmount: BN;
  openInterestForShortLongTokenAmount: BN;
  openInterestForShortShortTokenAmount: BN;
  openInterestInTokensForLongLongTokenAmount: BN;
  openInterestInTokensForLongShortTokenAmount: BN;
  openInterestInTokensForShortLongTokenAmount: BN;
  openInterestInTokensForShortShortTokenAmount: BN;
  positionImpactLongTokenAmount: BN;
  positionImpactShortTokenAmount: BN;
  borrowingFactorLongTokenAmount: BN;
  borrowingFactorShortTokenAmount: BN;
  fundingAmountPerSizeForLongLongTokenAmount: BN;
  fundingAmountPerSizeForLongShortTokenAmount: BN;
  fundingAmountPerSizeForShortLongTokenAmount: BN;
  fundingAmountPerSizeForShortShortTokenAmount: BN;
  claimableFundingAmountPerSizeForLongLongTokenAmount: BN;
  claimableFundingAmountPerSizeForLongShortTokenAmount: BN;
  claimableFundingAmountPerSizeForShortLongTokenAmount: BN;
  claimableFundingAmountPerSizeForShortShortTokenAmount: BN;
  collateralSumForLongLongTokenAmount: BN;
  collateralSumForLongShortTokenAmount: BN;
  collateralSumForShortLongTokenAmount: BN;
  collateralSumForShortShortTokenAmount: BN;
  totalBorrowingLongTokenAmount: BN;
  totalBorrowingShortTokenAmount: BN;

  longTokenBalance: BN;
  shortTokenBalance: BN;
  fundingFactorPerSecond: BN;
  tradeCount: BN;
  depositCount: BN;
  withdrawalCount: BN;
  orderCount: BN;
}

export interface MarketStatus {
  fundingFactorPerSecond: BN;
  borrowingFactorPerSecondForLong: BN;
  borrowingFactorPerSecondForShort: BN;
  pendingPnlForLong: BN;
  pendingPnlForShort: BN;
  reserveValueForLong: BN;
  reserveValueForShort: BN;
  poolValueWithoutPnlForLong: BN;
  poolValueWithoutPnlForShort: BN;
}

export interface MarketTokens {
  indexToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
}

export type MarketData = Market & MarketState;

export type MarketInfo = MarketData &
  Partial<MarketStatus> &
  MarketTokens & {
    name: string;
    poolValueMax: BN;
    poolValueMin: BN;
  };

export interface MarketsInfo {
  [marketTokenAddress: string]: MarketInfo;
}

export interface MarketTokensAPR {
  [marketTokenAddress: string]: BN;
}

export interface MarketTokensFee {
  [marketTokenAddress: string]: BN;
}

export type UserEarningsData = {
  byMarketAddress: {
    [marketTokenAddress: string]: {
      total: BN;
      recent7d: BN;
      expected365d: BN;
    };
  };

  allMarkets: {
    total: BN;
    recent7d: BN;
    expected365d: BN;
  };
};

export interface Markets {
  indexToken: PublicKey,
  marketToken: PublicKey,
  longToken: PublicKey,
  shortToken: PublicKey,
  unitPrice: string,
  volume24h: string,
  longOpenInterest: string,
  shortOpenInterest: string,
  lpLong: string,
  lpShort: string,
  maxLeverage: string,
  longFundingFeeRateHour: string,
  longBorrowingFeeRateHour: string,
  longNetRatePerHour: string,
  shortFundingFeeRateHour: string,
  shortBorrowingFeeRateHour: string,
  shortNetRatePerHour: string,
  reservedValueForLong: string,
  maxReserveValueForLong: string,
  openInterestForLong: string,
  maxOpenInterestForLong: string,
  reservedValueForShort: string,
  maxReserveValueForShort: string,
  openInterestForShort: string,
  maxOpenInterestForShort: string,
  prices: string[],
  supply: string,
  newPrices: {
    indexToken: {
      min: string,
      max: string
    },
    longToken: {
      min: string,
      max: string
    },
    shortToken: {
      min: string,
      max: string
    }
  }
}
