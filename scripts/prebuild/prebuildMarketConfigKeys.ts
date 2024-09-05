import fs from "fs";
import { resolve } from "path";
import entries from "lodash/entries";

import { hashDataMap } from "lib/multicall/hashDataMap";

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

import { MARKETS } from "config/static/markets";

export function prebuildMarketConfigKeys(outputDir: string) {
  const chainMarketKeys = entries(MARKETS).reduce((chainsAcc, [chainId, markets]) => {
    const chainMarkets = entries(markets).reduce((marketsAcc, [marketAddress, { tokens: market }]) => {
      const marketKeys = hashDataMap({
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
      });

      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFileSync(resolve(outputDir, "hashedMarketConfigKeys.json"), JSON.stringify(chainMarketKeys, null, 2));

  return chainMarketKeys;
}
