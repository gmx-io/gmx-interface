import {
  BORROWING_EXPONENT_FACTOR_KEY,
  BORROWING_FACTOR_KEY,
  FUNDING_DECREASE_FACTOR_PER_SECOND,
  FUNDING_EXPONENT_FACTOR_KEY,
  FUNDING_FACTOR_KEY,
  FUNDING_INCREASE_FACTOR_PER_SECOND,
  IS_MARKET_DISABLED_KEY,
  MAX_FUNDING_FACTOR_PER_SECOND,
  MAX_OPEN_INTEREST_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_KEY,
  MAX_POOL_AMOUNT_KEY,
  MAX_POOL_USD_FOR_DEPOSIT_KEY,
  MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY,
  MAX_POSITION_IMPACT_FACTOR_KEY,
  MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY,
  MIN_COLLATERAL_FACTOR_KEY,
  MIN_FUNDING_FACTOR_PER_SECOND,
  MIN_POSITION_IMPACT_POOL_AMOUNT_KEY,
  OPEN_INTEREST_RESERVE_FACTOR_KEY,
  POOL_AMOUNT_ADJUSTMENT_KEY,
  POSITION_FEE_FACTOR_KEY,
  POSITION_IMPACT_EXPONENT_FACTOR_KEY,
  POSITION_IMPACT_FACTOR_KEY,
  POSITION_IMPACT_POOL_DISTRIBUTION_RATE_KEY,
  RESERVE_FACTOR_KEY,
  SWAP_FEE_FACTOR_KEY,
  SWAP_IMPACT_EXPONENT_FACTOR_KEY,
  SWAP_IMPACT_FACTOR_KEY,
  THRESHOLD_FOR_DECREASE_FUNDING,
  THRESHOLD_FOR_STABLE_FUNDING,
  VIRTUAL_MARKET_ID_KEY,
  VIRTUAL_TOKEN_ID_KEY,
} from "config/dataStore";
import { getByKey } from "lib/objects";

import { MarketsData } from "domain/synthetics/markets/types";
import { MarketConfigMulticallRequestConfig } from "domain/synthetics/markets/useMarketsInfoRequest";

import DataStore from "abis/DataStore.json";

export async function buildMarketsConfigsRequest({
  marketsAddresses,
  marketsData,
  dataStoreAddress,
}: {
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  dataStoreAddress: string;
}) {
  const request: MarketConfigMulticallRequestConfig = {};
  for (const marketAddress of marketsAddresses || []) {
    const market = getByKey(marketsData, marketAddress)!;

    const unhashedKeys = {
      isDisabled: [
        ["bytes32", "address"],
        [IS_MARKET_DISABLED_KEY, marketAddress],
      ],
      maxLongPoolAmount: [
        ["bytes32", "address", "address"],
        [MAX_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
      ],
      maxShortPoolAmount: [
        ["bytes32", "address", "address"],
        [MAX_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
      ],
      maxLongPoolUsdForDeposit: [
        ["bytes32", "address", "address"],
        [MAX_POOL_USD_FOR_DEPOSIT_KEY, marketAddress, market.longTokenAddress],
      ],
      maxShortPoolUsdForDeposit: [
        ["bytes32", "address", "address"],
        [MAX_POOL_USD_FOR_DEPOSIT_KEY, marketAddress, market.shortTokenAddress],
      ],
      longPoolAmountAdjustment: [
        ["bytes32", "address", "address"],
        [POOL_AMOUNT_ADJUSTMENT_KEY, marketAddress, market.longTokenAddress],
      ],
      shortPoolAmountAdjustment: [
        ["bytes32", "address", "address"],
        [POOL_AMOUNT_ADJUSTMENT_KEY, marketAddress, market.shortTokenAddress],
      ],
      reserveFactorLong: [
        ["bytes32", "address", "bool"],
        [RESERVE_FACTOR_KEY, marketAddress, true],
      ],
      reserveFactorShort: [
        ["bytes32", "address", "bool"],
        [RESERVE_FACTOR_KEY, marketAddress, false],
      ],
      openInterestReserveFactorLong: [
        ["bytes32", "address", "bool"],
        [OPEN_INTEREST_RESERVE_FACTOR_KEY, marketAddress, true],
      ],
      openInterestReserveFactorShort: [
        ["bytes32", "address", "bool"],
        [OPEN_INTEREST_RESERVE_FACTOR_KEY, marketAddress, false],
      ],
      maxOpenInterestLong: [
        ["bytes32", "address", "bool"],
        [MAX_OPEN_INTEREST_KEY, marketAddress, true],
      ],
      maxOpenInterestShort: [
        ["bytes32", "address", "bool"],
        [MAX_OPEN_INTEREST_KEY, marketAddress, false],
      ],
      minPositionImpactPoolAmount: [
        ["bytes32", "address"],
        [MIN_POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
      ],
      positionImpactPoolDistributionRate: [
        ["bytes32", "address"],
        [POSITION_IMPACT_POOL_DISTRIBUTION_RATE_KEY, marketAddress],
      ],
      borrowingFactorLong: [
        ["bytes32", "address", "bool"],
        [BORROWING_FACTOR_KEY, marketAddress, true],
      ],
      borrowingFactorShort: [
        ["bytes32", "address", "bool"],
        [BORROWING_FACTOR_KEY, marketAddress, false],
      ],
      borrowingExponentFactorLong: [
        ["bytes32", "address", "bool"],
        [BORROWING_EXPONENT_FACTOR_KEY, marketAddress, true],
      ],
      borrowingExponentFactorShort: [
        ["bytes32", "address", "bool"],
        [BORROWING_EXPONENT_FACTOR_KEY, marketAddress, false],
      ],
      fundingFactor: [
        ["bytes32", "address"],
        [FUNDING_FACTOR_KEY, marketAddress],
      ],
      fundingExponentFactor: [
        ["bytes32", "address"],
        [FUNDING_EXPONENT_FACTOR_KEY, marketAddress],
      ],
      fundingIncreaseFactorPerSecond: [
        ["bytes32", "address"],
        [FUNDING_INCREASE_FACTOR_PER_SECOND, marketAddress],
      ],
      fundingDecreaseFactorPerSecond: [
        ["bytes32", "address"],
        [FUNDING_DECREASE_FACTOR_PER_SECOND, marketAddress],
      ],
      thresholdForStableFunding: [
        ["bytes32", "address"],
        [THRESHOLD_FOR_STABLE_FUNDING, marketAddress],
      ],
      thresholdForDecreaseFunding: [
        ["bytes32", "address"],
        [THRESHOLD_FOR_DECREASE_FUNDING, marketAddress],
      ],
      minFundingFactorPerSecond: [
        ["bytes32", "address"],
        [MIN_FUNDING_FACTOR_PER_SECOND, marketAddress],
      ],
      maxFundingFactorPerSecond: [
        ["bytes32", "address"],
        [MAX_FUNDING_FACTOR_PER_SECOND, marketAddress],
      ],
      maxPnlFactorForTradersLong: [
        ["bytes32", "bytes32", "address", "bool"],
        [MAX_PNL_FACTOR_KEY, MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, true],
      ],
      maxPnlFactorForTradersShort: [
        ["bytes32", "bytes32", "address", "bool"],
        [MAX_PNL_FACTOR_KEY, MAX_PNL_FACTOR_FOR_TRADERS_KEY, marketAddress, false],
      ],
      positionFeeFactorForPositiveImpact: [
        ["bytes32", "address", "bool"],
        [POSITION_FEE_FACTOR_KEY, marketAddress, true],
      ],
      positionFeeFactorForNegativeImpact: [
        ["bytes32", "address", "bool"],
        [POSITION_FEE_FACTOR_KEY, marketAddress, false],
      ],
      positionImpactFactorPositive: [
        ["bytes32", "address", "bool"],
        [POSITION_IMPACT_FACTOR_KEY, marketAddress, true],
      ],
      positionImpactFactorNegative: [
        ["bytes32", "address", "bool"],
        [POSITION_IMPACT_FACTOR_KEY, marketAddress, false],
      ],
      maxPositionImpactFactorPositive: [
        ["bytes32", "address", "bool"],
        [MAX_POSITION_IMPACT_FACTOR_KEY, marketAddress, true],
      ],
      maxPositionImpactFactorNegative: [
        ["bytes32", "address", "bool"],
        [MAX_POSITION_IMPACT_FACTOR_KEY, marketAddress, false],
      ],
      maxPositionImpactFactorForLiquidations: [
        ["bytes32", "address"],
        [MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY, marketAddress],
      ],
      minCollateralFactor: [
        ["bytes32", "address"],
        [MIN_COLLATERAL_FACTOR_KEY, marketAddress],
      ],
      minCollateralFactorForOpenInterestLong: [
        ["bytes32", "address", "bool"],
        [MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY, marketAddress, true],
      ],
      minCollateralFactorForOpenInterestShort: [
        ["bytes32", "address", "bool"],
        [MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY, marketAddress, false],
      ],
      positionImpactExponentFactor: [
        ["bytes32", "address"],
        [POSITION_IMPACT_EXPONENT_FACTOR_KEY, marketAddress],
      ],
      swapFeeFactorForPositiveImpact: [
        ["bytes32", "address", "bool"],
        [SWAP_FEE_FACTOR_KEY, marketAddress, true],
      ],
      swapFeeFactorForNegativeImpact: [
        ["bytes32", "address", "bool"],
        [SWAP_FEE_FACTOR_KEY, marketAddress, false],
      ],
      swapImpactFactorPositive: [
        ["bytes32", "address", "bool"],
        [SWAP_IMPACT_FACTOR_KEY, marketAddress, true],
      ],
      swapImpactFactorNegative: [
        ["bytes32", "address", "bool"],
        [SWAP_IMPACT_FACTOR_KEY, marketAddress, false],
      ],
      swapImpactExponentFactor: [
        ["bytes32", "address"],
        [SWAP_IMPACT_EXPONENT_FACTOR_KEY, marketAddress],
      ],
      virtualMarketId: [
        ["bytes32", "address"],
        [VIRTUAL_MARKET_ID_KEY, marketAddress],
      ],
      virtualLongTokenId: [
        ["bytes32", "address"],
        [VIRTUAL_TOKEN_ID_KEY, market.longTokenAddress],
      ],
      virtualShortTokenId: [
        ["bytes32", "address"],
        [VIRTUAL_TOKEN_ID_KEY, market.shortTokenAddress],
      ],
    };

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abi: DataStore.abi,
      shouldHashParams: true,
      calls: {
        isDisabled: {
          methodName: "getBool",
          params: [unhashedKeys.isDisabled],
        },
        maxLongPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.maxLongPoolAmount],
        },
        maxShortPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.maxShortPoolAmount],
        },
        maxLongPoolUsdForDeposit: {
          methodName: "getUint",
          params: [unhashedKeys.maxLongPoolUsdForDeposit],
        },
        maxShortPoolUsdForDeposit: {
          methodName: "getUint",
          params: [unhashedKeys.maxShortPoolUsdForDeposit],
        },
        longPoolAmountAdjustment: {
          methodName: "getUint",
          params: [unhashedKeys.longPoolAmountAdjustment],
        },
        shortPoolAmountAdjustment: {
          methodName: "getUint",
          params: [unhashedKeys.shortPoolAmountAdjustment],
        },
        reserveFactorLong: {
          methodName: "getUint",
          params: [unhashedKeys.reserveFactorLong],
        },
        reserveFactorShort: {
          methodName: "getUint",
          params: [unhashedKeys.reserveFactorShort],
        },
        openInterestReserveFactorLong: {
          methodName: "getUint",
          params: [unhashedKeys.openInterestReserveFactorLong],
        },
        openInterestReserveFactorShort: {
          methodName: "getUint",
          params: [unhashedKeys.openInterestReserveFactorShort],
        },
        maxOpenInterestLong: {
          methodName: "getUint",
          params: [unhashedKeys.maxOpenInterestLong],
        },
        maxOpenInterestShort: {
          methodName: "getUint",
          params: [unhashedKeys.maxOpenInterestShort],
        },
        minPositionImpactPoolAmount: {
          methodName: "getUint",
          params: [unhashedKeys.minPositionImpactPoolAmount],
        },
        positionImpactPoolDistributionRate: {
          methodName: "getUint",
          params: [unhashedKeys.positionImpactPoolDistributionRate],
        },
        borrowingFactorLong: {
          methodName: "getUint",
          params: [unhashedKeys.borrowingFactorLong],
        },
        borrowingFactorShort: {
          methodName: "getUint",
          params: [unhashedKeys.borrowingFactorShort],
        },
        borrowingExponentFactorLong: {
          methodName: "getUint",
          params: [unhashedKeys.borrowingExponentFactorLong],
        },
        borrowingExponentFactorShort: {
          methodName: "getUint",
          params: [unhashedKeys.borrowingExponentFactorShort],
        },
        fundingFactor: {
          methodName: "getUint",
          params: [unhashedKeys.fundingFactor],
        },
        fundingExponentFactor: {
          methodName: "getUint",
          params: [unhashedKeys.fundingExponentFactor],
        },
        fundingIncreaseFactorPerSecond: {
          methodName: "getUint",
          params: [unhashedKeys.fundingIncreaseFactorPerSecond],
        },
        fundingDecreaseFactorPerSecond: {
          methodName: "getUint",
          params: [unhashedKeys.fundingDecreaseFactorPerSecond],
        },
        thresholdForStableFunding: {
          methodName: "getUint",
          params: [unhashedKeys.thresholdForStableFunding],
        },
        thresholdForDecreaseFunding: {
          methodName: "getUint",
          params: [unhashedKeys.thresholdForDecreaseFunding],
        },
        minFundingFactorPerSecond: {
          methodName: "getUint",
          params: [unhashedKeys.minFundingFactorPerSecond],
        },
        maxFundingFactorPerSecond: {
          methodName: "getUint",
          params: [unhashedKeys.maxFundingFactorPerSecond],
        },
        maxPnlFactorForTradersLong: {
          methodName: "getUint",
          params: [unhashedKeys.maxPnlFactorForTradersLong],
        },
        maxPnlFactorForTradersShort: {
          methodName: "getUint",
          params: [unhashedKeys.maxPnlFactorForTradersShort],
        },
        positionFeeFactorForPositiveImpact: {
          methodName: "getUint",
          params: [unhashedKeys.positionFeeFactorForPositiveImpact],
        },
        positionFeeFactorForNegativeImpact: {
          methodName: "getUint",
          params: [unhashedKeys.positionFeeFactorForNegativeImpact],
        },
        positionImpactFactorPositive: {
          methodName: "getUint",
          params: [unhashedKeys.positionImpactFactorPositive],
        },
        positionImpactFactorNegative: {
          methodName: "getUint",
          params: [unhashedKeys.positionImpactFactorNegative],
        },
        maxPositionImpactFactorPositive: {
          methodName: "getUint",
          params: [unhashedKeys.maxPositionImpactFactorPositive],
        },
        maxPositionImpactFactorNegative: {
          methodName: "getUint",
          params: [unhashedKeys.maxPositionImpactFactorNegative],
        },
        maxPositionImpactFactorForLiquidations: {
          methodName: "getUint",
          params: [unhashedKeys.maxPositionImpactFactorForLiquidations],
        },
        minCollateralFactor: {
          methodName: "getUint",
          params: [unhashedKeys.minCollateralFactor],
        },
        minCollateralFactorForOpenInterestLong: {
          methodName: "getUint",
          params: [unhashedKeys.minCollateralFactorForOpenInterestLong],
        },
        minCollateralFactorForOpenInterestShort: {
          methodName: "getUint",
          params: [unhashedKeys.minCollateralFactorForOpenInterestShort],
        },
        positionImpactExponentFactor: {
          methodName: "getUint",
          params: [unhashedKeys.positionImpactExponentFactor],
        },
        swapFeeFactorForPositiveImpact: {
          methodName: "getUint",
          params: [unhashedKeys.swapFeeFactorForPositiveImpact],
        },
        swapFeeFactorForNegativeImpact: {
          methodName: "getUint",
          params: [unhashedKeys.swapFeeFactorForNegativeImpact],
        },
        swapImpactFactorPositive: {
          methodName: "getUint",
          params: [unhashedKeys.swapImpactFactorPositive],
        },
        swapImpactFactorNegative: {
          methodName: "getUint",
          params: [unhashedKeys.swapImpactFactorNegative],
        },
        swapImpactExponentFactor: {
          methodName: "getUint",
          params: [unhashedKeys.swapImpactExponentFactor],
        },
        virtualMarketId: {
          methodName: "getBytes32",
          params: [unhashedKeys.virtualMarketId],
        },
        virtualShortTokenId: {
          methodName: "getBytes32",
          params: [unhashedKeys.virtualShortTokenId],
        },
        virtualLongTokenId: {
          methodName: "getBytes32",
          params: [unhashedKeys.virtualLongTokenId],
        },
      },
    };
  }

  return request;
}
