import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import {
  MarketInfo,
  MarketsData,
  MarketsInfoData,
  getMarketFullName,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import type { TokenData, TokensData } from "domain/synthetics/tokens";
import { convertToTokenAmount, getTokenData } from "domain/synthetics/tokens/utils";
import { expandDecimals } from "lib/numbers";
import { PositionInfo } from "sdk/types/positions";
import { getLeverage } from "sdk/utils/positions";
import { zeroAddress } from "viem";
import { getPositionKey } from "../positions";
import { expect } from "vitest";
import { ExternalSwapAggregator, ExternalSwapQuote, getMarkPrice } from "../trade";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { AVALANCHE } from "config/chains";

export function usdToToken(usd: number, token: TokenData) {
  return convertToTokenAmount(expandDecimals(usd, 30), token.decimals, token.prices?.minPrice)!;
}

export function mockMarketKeys() {
  return [
    "AVAX-AVAX-USDC",
    "ETH-ETH-USDC",
    "ETH-ETH-DAI",
    "SOL-ETH-USDC",
    "BTC-BTC-DAI",
    "SPOT-USDC-DAI",
    "SPOT-DAI-USDC",
    // same collaterals, should be disabled for swaps
    "ETH-USDC-USDC",
    // Unreachable markets
    "TBTC-TBTC-TBTC",
    "TETH_A-TETH_A-TETH_B",
    // Partially unreachable markets
    "TEST_B-TEST_B-TEST_A",
    "TEST_C-TEST_C-TEST_A",
  ];
}

export function mockTokensData(overrides: { [symbol: string]: TokenData } = {}): TokensData {
  const tokens: TokensData = {
    AVAX: {
      address: "AVAX",
      wrappedAddress: "WAVAX",
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      isNative: true,
      prices: {
        minPrice: expandDecimals(12, 30),
        maxPrice: expandDecimals(12, 30),
      },
      ...((overrides.AVAX || {}) as any),
    },
    WAVAX: {
      address: "WAVAX",
      name: "Wrapped Avalanche",
      symbol: "WAVAX",
      decimals: 18,
      isNative: true,
      prices: {
        minPrice: expandDecimals(12, 30),
        maxPrice: expandDecimals(12, 30),
      },
      ...((overrides.AVAX || {}) as any),
    },
    USDC: {
      address: "USDC",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.USDC || {}) as any),
    },
    ETH: {
      address: "ETH",
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      prices: {
        minPrice: expandDecimals(1200, 30),
        maxPrice: expandDecimals(1200, 30),
      },
      ...((overrides.ETH || {}) as any),
    },
    BTC: {
      address: "BTC",
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      prices: {
        minPrice: expandDecimals(20000, 30),
        maxPrice: expandDecimals(20000, 30),
      },
      ...((overrides.BTC || {}) as any),
    },
    DAI: {
      address: "DAI",
      name: "Dai",
      symbol: "DAI",
      decimals: 30,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.DAI || {}) as any),
    },
    SOL: {
      address: "SOL",
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      isSynthetic: true,
      prices: {
        minPrice: expandDecimals(16, 30),
        maxPrice: expandDecimals(16, 30),
      },
      ...((overrides.SOL || {}) as any),
    },
    SPOT: {
      address: "SPOT",
      name: "SPOT",
      decimals: 30,
      symbol: "SPOT",
      prices: {
        minPrice: BigInt(1),
        maxPrice: BigInt(1),
      },
      ...((overrides.SPOT || {}) as any),
    },
    ...overrides,
  };

  return tokens;
}

/**
 * @param marketKeys - array of market keys in the following format: indexToken-longToken-shortToken
 */
export function mockMarketsData(marketKeys: string[]): MarketsData {
  return marketKeys.reduce((acc, key) => {
    const [indexTokenAddress, longTokenAddress, shortTokenAddress] = key.split("-");

    acc[key] = {
      marketTokenAddress: key,
      indexTokenAddress,
      longTokenAddress,
      shortTokenAddress,
      isSameCollaterals: longTokenAddress === shortTokenAddress,
      isSpotOnly: indexTokenAddress === "SPOT",
      data: "",
      name: "Test Market",
    };

    return acc;
  }, {} as MarketsData);
}

export function mockMarketsInfoData(
  tokensData: TokensData,
  marketKeys: string[],
  overrides: { [marketKey: string]: Partial<any> } = {}
): MarketsInfoData {
  return marketKeys.reduce((acc, key) => {
    const [indexTokenAddress, longTokenAddress, shortTokenAddress] = key.split("-");

    const indexToken = getTokenData(tokensData, indexTokenAddress)!;
    const longToken = getTokenData(tokensData, longTokenAddress)!;
    const shortToken = getTokenData(tokensData, shortTokenAddress)!;

    const isSpotOnly = indexTokenAddress === "SPOT";

    acc[key] = {
      isDisabled: false,

      marketTokenAddress: key,
      indexTokenAddress,
      longTokenAddress,
      shortTokenAddress,

      isSameCollaterals: longTokenAddress === shortTokenAddress,
      isSpotOnly,

      name: getMarketFullName({ longToken, shortToken, indexToken, isSpotOnly }),

      longToken,
      shortToken,
      indexToken,

      longPoolAmount: usdToToken(1000, longToken),
      shortPoolAmount: usdToToken(1000, shortToken),

      maxLongPoolAmount: usdToToken(10000, longToken),
      maxShortPoolAmount: usdToToken(10000, shortToken),
      maxLongPoolUsdForDeposit: usdToToken(10000, longToken),
      maxShortPoolUsdForDeposit: usdToToken(10000, shortToken),

      poolValueMax: expandDecimals(2000, USD_DECIMALS),
      poolValueMin: expandDecimals(2000, USD_DECIMALS),

      reserveFactorLong: expandDecimals(5, 29),
      reserveFactorShort: expandDecimals(5, 29),

      openInterestReserveFactorLong: expandDecimals(5, 29),
      openInterestReserveFactorShort: expandDecimals(5, 29),

      maxOpenInterestLong: expandDecimals(5, 29),
      maxOpenInterestShort: expandDecimals(5, 29),

      positionImpactPoolAmount: usdToToken(1000, indexToken),
      positionImpactPoolDistributionRate: 0n,
      minPositionImpactPoolAmount: 0n,

      swapImpactPoolAmountLong: usdToToken(1000, longToken),
      swapImpactPoolAmountShort: usdToToken(1000, shortToken),

      positionFeeFactorForPositiveImpact: expandDecimals(5, 26),
      positionFeeFactorForNegativeImpact: expandDecimals(5, 26),
      positionImpactFactorPositive: expandDecimals(2, 23),
      positionImpactFactorNegative: expandDecimals(1, 23),
      maxPositionImpactFactorPositive: expandDecimals(2, 23),
      maxPositionImpactFactorNegative: expandDecimals(1, 23),
      maxPositionImpactFactorForLiquidations: expandDecimals(1, 23),
      positionImpactExponentFactor: expandDecimals(2, 30),

      swapFeeFactorForPositiveImpact: expandDecimals(2, 27),
      swapFeeFactorForNegativeImpact: expandDecimals(2, 27),

      swapImpactFactorPositive: expandDecimals(2, 23),
      swapImpactFactorNegative: expandDecimals(1, 23),
      swapImpactExponentFactor: expandDecimals(2, 30),

      // MarketInfo
      borrowingFactorPerSecondForLongs: 0n,
      borrowingFactorPerSecondForShorts: 0n,

      borrowingExponentFactorLong: 0n,
      borrowingExponentFactorShort: 0n,
      fundingFactor: 0n,
      fundingExponentFactor: 0n,
      fundingIncreaseFactorPerSecond: 0n,
      fundingDecreaseFactorPerSecond: 0n,
      maxFundingFactorPerSecond: 0n,
      minFundingFactorPerSecond: 0n,
      thresholdForDecreaseFunding: 0n,
      thresholdForStableFunding: 0n,

      totalBorrowingFees: 0n,
      minCollateralFactor: 0n,

      minCollateralFactorForOpenInterestLong: 0n,
      minCollateralFactorForOpenInterestShort: 0n,

      longPoolAmountAdjustment: 0n,
      shortPoolAmountAdjustment: 0n,
      borrowingFactorLong: 0n,
      borrowingFactorShort: 0n,

      fundingFactorPerSecond: 0n,
      longsPayShorts: false,

      longInterestUsd: expandDecimals(500, USD_DECIMALS),
      shortInterestUsd: expandDecimals(500, USD_DECIMALS),
      longInterestInTokens: usdToToken(500, indexToken),
      shortInterestInTokens: usdToToken(500, indexToken),

      maxPnlFactorForTradersLong: expandDecimals(1, 30),
      maxPnlFactorForTradersShort: expandDecimals(1, 30),

      data: "",

      virtualPoolAmountForLongToken: 0n,
      virtualPoolAmountForShortToken: 0n,
      virtualInventoryForPositions: 0n,

      virtualMarketId: zeroAddress,
      virtualLongTokenId: zeroAddress,
      virtualShortTokenId: zeroAddress,

      ...(overrides[key] || {}),
    };

    return acc;
  }, {} as MarketsInfoData);
}

export function mockPositionInfo(
  {
    marketInfo,
    collateralTokenAddress,
    account,
    isLong,
    sizeInUsd,
    collateralUsd,
  }: {
    marketInfo: MarketInfo;
    collateralTokenAddress: string;
    account: string;
    sizeInUsd: bigint;
    collateralUsd: bigint;
    isLong: boolean;
  },
  overrides: Partial<PositionInfo> = {}
): PositionInfo {
  const collateralToken =
    collateralTokenAddress === marketInfo.longToken.address ? marketInfo.longToken : marketInfo.shortToken;

  const collateralAmount = convertToTokenAmount(
    collateralUsd,
    collateralToken.decimals,
    collateralToken.prices?.minPrice
  )!;

  const posiionKey = getPositionKey(account, marketInfo.marketTokenAddress, collateralTokenAddress, isLong);

  return {
    data: "",
    key: posiionKey,
    contractKey: posiionKey + "contractKey",
    account: account,
    marketAddress: marketInfo.marketTokenAddress,
    collateralTokenAddress,
    sizeInUsd,
    sizeInTokens: convertToTokenAmount(
      sizeInUsd,
      marketInfo.indexToken.decimals,
      marketInfo.indexToken.prices?.minPrice
    )!,
    collateralAmount: convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralToken.prices?.minPrice)!,
    increasedAtTime: BigInt((Date.now() / 1000) >> 0),
    decreasedAtTime: BigInt((Date.now() / 1000) >> 0),
    isLong: true,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    marketInfo,
    market: marketInfo,
    longToken: marketInfo.longToken,
    shortToken: marketInfo.shortToken,
    indexName: getMarketIndexName(marketInfo),
    poolName: getMarketPoolName(marketInfo),
    indexToken: marketInfo.indexToken,
    collateralToken,
    pnlToken: marketInfo.longToken,
    markPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    entryPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    liquidationPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    collateralUsd,
    remainingCollateralUsd: collateralUsd,
    remainingCollateralAmount: collateralAmount,
    hasLowCollateral: false,
    leverage: getLeverage({
      sizeInUsd,
      collateralUsd,
      pnl: 0n,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
    }),
    leverageWithPnl: 0n,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netValue: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
    positionFeeAmount: 0n,
    traderDiscountAmount: 0n,
    uiFeeAmount: 0n,
    ...overrides,
  };
}

export const MOCK_TXN_DATA = {
  to: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
  data: "0xabcd",
  value: 0n,
  estimatedGas: 100000n,
};

export function mockExternalSwapQuote(overrides: Partial<ExternalSwapQuote> = {}): ExternalSwapQuote {
  return {
    aggregator: ExternalSwapAggregator.OpenOcean,
    inTokenAddress: getTokenBySymbol(AVALANCHE, "BTC").address,
    outTokenAddress: getTokenBySymbol(AVALANCHE, "USDC").address,
    amountIn: 1000000n,
    amountOut: 900000n,
    usdIn: 1000000n,
    usdOut: 900000n,
    priceIn: 1000000n,
    priceOut: 900000n,
    feesUsd: 100000n,
    needSpenderApproval: false,
    txnData: MOCK_TXN_DATA,
    ...overrides,
  };
}

export function expectBigNumberClose(actual: bigint, expected: bigint, maxDiffBps = 1n) {
  const diff = actual > expected ? actual - expected : expected - actual;
  const diffBps = (diff * BASIS_POINTS_DIVISOR_BIGINT) / expected;
  expect(diffBps).toBeLessThanOrEqual(maxDiffBps);
}
