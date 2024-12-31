import { HASHED_MARKET_CONFIG_KEYS } from "sdk/prebuilt";

import { MarketConfigMulticallRequestConfig } from "sdk/modules/markets/types";

import DataStore from "sdk/abis/DataStore.json";

export async function buildMarketsConfigsRequest(
  chainId: number,
  {
    marketsAddresses,
    dataStoreAddress,
  }: {
    marketsAddresses: string[] | undefined;
    dataStoreAddress: string;
  }
) {
  const request: MarketConfigMulticallRequestConfig = {};
  for (const marketAddress of marketsAddresses || []) {
    const prebuiltHashedKeys = HASHED_MARKET_CONFIG_KEYS[chainId]?.[marketAddress];

    if (!prebuiltHashedKeys) {
      throw new Error(
        `No pre-built hashed config keys found for the market ${marketAddress}. Run \`yarn prebuild\` to generate them.`
      );
    }

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      calls: {
        isDisabled: {
          methodName: "getBool",
          params: [prebuiltHashedKeys.isDisabled],
        },
        maxLongPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLongPoolAmount],
        },
        maxShortPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxShortPoolAmount],
        },
        maxLongPoolUsdForDeposit: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLongPoolUsdForDeposit],
        },
        maxShortPoolUsdForDeposit: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxShortPoolUsdForDeposit],
        },
        longPoolAmountAdjustment: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longPoolAmountAdjustment],
        },
        shortPoolAmountAdjustment: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortPoolAmountAdjustment],
        },
        reserveFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.reserveFactorLong],
        },
        reserveFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.reserveFactorShort],
        },
        openInterestReserveFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.openInterestReserveFactorLong],
        },
        openInterestReserveFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.openInterestReserveFactorShort],
        },
        maxOpenInterestLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxOpenInterestLong],
        },
        maxOpenInterestShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxOpenInterestShort],
        },
        minPositionImpactPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minPositionImpactPoolAmount],
        },
        positionImpactPoolDistributionRate: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactPoolDistributionRate],
        },
        borrowingFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingFactorLong],
        },
        borrowingFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingFactorShort],
        },
        borrowingExponentFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingExponentFactorLong],
        },
        borrowingExponentFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingExponentFactorShort],
        },
        fundingFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingFactor],
        },
        fundingExponentFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingExponentFactor],
        },
        fundingIncreaseFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingIncreaseFactorPerSecond],
        },
        fundingDecreaseFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingDecreaseFactorPerSecond],
        },
        thresholdForStableFunding: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.thresholdForStableFunding],
        },
        thresholdForDecreaseFunding: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.thresholdForDecreaseFunding],
        },
        minFundingFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minFundingFactorPerSecond],
        },
        maxFundingFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxFundingFactorPerSecond],
        },
        maxPnlFactorForTradersLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPnlFactorForTradersLong],
        },
        maxPnlFactorForTradersShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPnlFactorForTradersShort],
        },
        positionFeeFactorForPositiveImpact: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionFeeFactorForPositiveImpact],
        },
        positionFeeFactorForNegativeImpact: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionFeeFactorForNegativeImpact],
        },
        positionImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactFactorPositive],
        },
        positionImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactFactorNegative],
        },
        maxPositionImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorPositive],
        },
        maxPositionImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorNegative],
        },
        maxPositionImpactFactorForLiquidations: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorForLiquidations],
        },
        minCollateralFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactor],
        },
        minCollateralFactorForOpenInterestLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactorForOpenInterestLong],
        },
        minCollateralFactorForOpenInterestShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactorForOpenInterestShort],
        },
        positionImpactExponentFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactExponentFactor],
        },
        swapFeeFactorForPositiveImpact: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapFeeFactorForPositiveImpact],
        },
        swapFeeFactorForNegativeImpact: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapFeeFactorForNegativeImpact],
        },
        swapImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactFactorPositive],
        },
        swapImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactFactorNegative],
        },
        swapImpactExponentFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactExponentFactor],
        },
        virtualMarketId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualMarketId],
        },
        virtualShortTokenId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualShortTokenId],
        },
        virtualLongTokenId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualLongTokenId],
        },
      },
    };
  }

  return request;
}
