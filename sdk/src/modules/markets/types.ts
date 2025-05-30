import { MarketInfo, MarketsData, MarketsInfoData } from "types/markets";
import { TokensData } from "types/tokens";
import { MulticallRequestConfig } from "utils/multicall";

export type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
  error?: Error | undefined;
};

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
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
  | "longPoolAmountAdjustment"
  | "shortPoolAmountAdjustment"
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
  | "minCollateralFactorForOpenInterestLong"
  | "minCollateralFactorForOpenInterestShort"
  | "positionFeeFactorForPositiveImpact"
  | "positionFeeFactorForNegativeImpact"
  | "positionImpactFactorPositive"
  | "positionImpactFactorNegative"
  | "maxPositionImpactFactorPositive"
  | "maxPositionImpactFactorNegative"
  | "maxPositionImpactFactorForLiquidations"
  | "positionImpactExponentFactor"
  | "swapFeeFactorForPositiveImpact"
  | "swapFeeFactorForNegativeImpact"
  | "swapImpactFactorPositive"
  | "swapImpactFactorNegative"
  | "swapImpactExponentFactor"
  | "atomicSwapFeeFactor"
  | "virtualMarketId"
  | "virtualLongTokenId"
  | "virtualShortTokenId"
>;

export type MarketValuesMulticallRequestConfig = MulticallRequestConfig<{
  [key: `${string}-reader`]: {
    calls: Record<
      "marketInfo" | "marketTokenPriceMax" | "marketTokenPriceMin",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
  [key: `${string}-dataStore`]: {
    calls: Record<
      | "longPoolAmount"
      | "shortPoolAmount"
      | "positionImpactPoolAmount"
      | "swapImpactPoolAmountLong"
      | "swapImpactPoolAmountShort"
      | "longInterestUsingLongToken"
      | "longInterestUsingShortToken"
      | "shortInterestUsingLongToken"
      | "shortInterestUsingShortToken"
      | "longInterestInTokensUsingLongToken"
      | "longInterestInTokensUsingShortToken"
      | "shortInterestInTokensUsingLongToken"
      | "shortInterestInTokensUsingShortToken",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
}>;

export type MarketConfigMulticallRequestConfig = MulticallRequestConfig<{
  [key: `${string}-dataStore`]: {
    calls: Record<
      | "isDisabled"
      | "maxLongPoolAmount"
      | "maxShortPoolAmount"
      | "maxLongPoolUsdForDeposit"
      | "maxShortPoolUsdForDeposit"
      | "longPoolAmountAdjustment"
      | "shortPoolAmountAdjustment"
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
      | "thresholdForStableFunding"
      | "thresholdForDecreaseFunding"
      | "minFundingFactorPerSecond"
      | "maxFundingFactorPerSecond"
      | "maxPnlFactorForTradersLong"
      | "maxPnlFactorForTradersShort"
      | "positionFeeFactorForPositiveImpact"
      | "positionFeeFactorForNegativeImpact"
      | "positionImpactFactorPositive"
      | "positionImpactFactorNegative"
      | "maxPositionImpactFactorPositive"
      | "maxPositionImpactFactorNegative"
      | "maxPositionImpactFactorForLiquidations"
      | "minCollateralFactor"
      | "minCollateralFactorForOpenInterestLong"
      | "minCollateralFactorForOpenInterestShort"
      | "positionImpactExponentFactor"
      | "swapFeeFactorForPositiveImpact"
      | "swapFeeFactorForNegativeImpact"
      | "atomicSwapFeeFactor"
      | "swapImpactFactorPositive"
      | "swapImpactFactorNegative"
      | "swapImpactExponentFactor"
      | "virtualMarketId"
      | "virtualLongTokenId"
      | "virtualShortTokenId",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
}>;

export type KinkModelMarketRateMulticallRequestConfig = MulticallRequestConfig<{
  [key: `${string}-dataStore`]: {
    calls: Record<
      | "optimalUsageFactorLong"
      | "optimalUsageFactorShort"
      | "baseBorrowingFactorLong"
      | "baseBorrowingFactorShort"
      | "aboveOptimalUsageBorrowingFactorLong"
      | "aboveOptimalUsageBorrowingFactorShort",
      {
        methodName: string;
        params: any[];
      }
    >;
  };
}>;
