import {
  ATOMIC_SWAP_FEE_FACTOR_KEY,
  BORROWING_EXPONENT_FACTOR_KEY,
  BORROWING_FACTOR_KEY,
  FUNDING_DECREASE_FACTOR_PER_SECOND,
  FUNDING_EXPONENT_FACTOR_KEY,
  FUNDING_FACTOR_KEY,
  FUNDING_INCREASE_FACTOR_PER_SECOND,
  IS_MARKET_DISABLED_KEY,
  LENT_POSITION_IMPACT_POOL_AMOUNT_KEY,
  MAX_FUNDING_FACTOR_PER_SECOND,
  MAX_LENDABLE_IMPACT_FACTOR_FOR_WITHDRAWALS_KEY,
  MAX_LENDABLE_IMPACT_FACTOR_KEY,
  MAX_LENDABLE_IMPACT_USD_KEY,
  MAX_OPEN_INTEREST_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_KEY,
  MAX_POOL_AMOUNT_KEY,
  MAX_POOL_USD_FOR_DEPOSIT_KEY,
  MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS_KEY,
  MAX_POSITION_IMPACT_FACTOR_KEY,
  MIN_COLLATERAL_FACTOR_FOR_LIQUIDATION_KEY,
  MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER_KEY,
  MIN_COLLATERAL_FACTOR_KEY,
  MIN_FUNDING_FACTOR_PER_SECOND,
  MIN_POSITION_IMPACT_POOL_AMOUNT_KEY,
  OPEN_INTEREST_IN_TOKENS_KEY,
  OPEN_INTEREST_KEY,
  OPEN_INTEREST_RESERVE_FACTOR_KEY,
  POOL_AMOUNT_ADJUSTMENT_KEY,
  POOL_AMOUNT_KEY,
  POSITION_FEE_FACTOR_KEY,
  POSITION_IMPACT_EXPONENT_FACTOR_KEY,
  POSITION_IMPACT_FACTOR_KEY,
  POSITION_IMPACT_POOL_AMOUNT_KEY,
  POSITION_IMPACT_POOL_DISTRIBUTION_RATE_KEY,
  RESERVE_FACTOR_KEY,
  SWAP_FEE_FACTOR_KEY,
  SWAP_IMPACT_EXPONENT_FACTOR_KEY,
  SWAP_IMPACT_FACTOR_KEY,
  SWAP_IMPACT_POOL_AMOUNT_KEY,
  THRESHOLD_FOR_DECREASE_FUNDING,
  THRESHOLD_FOR_STABLE_FUNDING,
  VIRTUAL_MARKET_ID_KEY,
  VIRTUAL_TOKEN_ID_KEY,
} from "configs/dataStore";
import { MarketConfig } from "configs/markets";
import { hashDataMap } from "utils/hash";

export function hashMarketConfigKeys(market: MarketConfig) {
  const marketAddress = market.marketTokenAddress;
  return hashDataMap({
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
    positionFeeFactorForBalanceWasImproved: [
      ["bytes32", "address", "bool"],
      [POSITION_FEE_FACTOR_KEY, marketAddress, true],
    ],
    positionFeeFactorForBalanceWasNotImproved: [
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
    maxLendableImpactFactor: [
      ["bytes32", "address"],
      [MAX_LENDABLE_IMPACT_FACTOR_KEY, marketAddress],
    ],
    maxLendableImpactFactorForWithdrawals: [
      ["bytes32", "address"],
      [MAX_LENDABLE_IMPACT_FACTOR_FOR_WITHDRAWALS_KEY, marketAddress],
    ],
    maxLendableImpactUsd: [
      ["bytes32", "address"],
      [MAX_LENDABLE_IMPACT_USD_KEY, marketAddress],
    ],
    lentPositionImpactPoolAmount: [
      ["bytes32", "address"],
      [LENT_POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
    ],
    minCollateralFactor: [
      ["bytes32", "address"],
      [MIN_COLLATERAL_FACTOR_KEY, marketAddress],
    ],
    minCollateralFactorForLiquidation: [
      ["bytes32", "address"],
      [MIN_COLLATERAL_FACTOR_FOR_LIQUIDATION_KEY, marketAddress],
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
    swapFeeFactorForBalanceWasImproved: [
      ["bytes32", "address", "bool"],
      [SWAP_FEE_FACTOR_KEY, marketAddress, true],
    ],
    swapFeeFactorForBalanceWasNotImproved: [
      ["bytes32", "address", "bool"],
      [SWAP_FEE_FACTOR_KEY, marketAddress, false],
    ],
    atomicSwapFeeFactor: [
      ["bytes32", "address"],
      [ATOMIC_SWAP_FEE_FACTOR_KEY, marketAddress],
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
}

export function hashMarketValuesKeys(market: MarketConfig) {
  const marketAddress = market.marketTokenAddress;
  const marketKeys = hashDataMap({
    longPoolAmount: [
      ["bytes32", "address", "address"],
      [POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
    ],
    shortPoolAmount: [
      ["bytes32", "address", "address"],
      [POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
    ],
    positionImpactPoolAmount: [
      ["bytes32", "address"],
      [POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
    ],
    swapImpactPoolAmountLong: [
      ["bytes32", "address", "address"],
      [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
    ],
    swapImpactPoolAmountShort: [
      ["bytes32", "address", "address"],
      [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
    ],
    longInterestUsingLongToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, true],
    ],
    longInterestUsingShortToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, true],
    ],
    shortInterestUsingLongToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, false],
    ],
    shortInterestUsingShortToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, false],
    ],
    longInterestInTokensUsingLongToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, true],
    ],
    longInterestInTokensUsingShortToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, true],
    ],
    shortInterestInTokensUsingLongToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, false],
    ],
    shortInterestInTokensUsingShortToken: [
      ["bytes32", "address", "address", "bool"],
      [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, false],
    ],
  });

  return marketKeys;
}
