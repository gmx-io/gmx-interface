import { describe, expect, it } from "vitest";

import { buildMarketsAdjacencyGraph } from "swap/buildMarketsAdjacencyGraph";
import { mockMarketsInfoData, mockTokensData, usdToToken } from "../../test/mock";
import { findSwapPathsBetweenTokens } from "swap/buildSwapRoutes";
import { expandDecimals } from "utils/numbers";
import {
  createNaiveNetworkEstimator,
  createNaiveSwapEstimator,
  getNaiveBestMarketSwapPathsFromTokenSwapPaths,
  getTokenSwapPathsForTokenPair,
} from "swap/swapRouting";
import { USD_DECIMALS } from "configs/factors";
import { MarketInfo } from "types/markets";
import { NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { GasLimitsConfig } from "types/fees";

const marketKeys = [
  "ETH-ETH-USDC",
  "BTC-BTC-USDC",
  "BTC-BTC-DAI",

  "SOL-SOL-USDC",
  "SOL-ETH-USDC",
  "SOL-BTC-USDC",

  "SPOT-DAI-USDC",
  "SPOT-USDC-DAI",
];

const tokensData = mockTokensData();

const baseMarketsInfoData = mockMarketsInfoData(tokensData, marketKeys);
const marketAdjacencyGraph = buildMarketsAdjacencyGraph(baseMarketsInfoData);
const swapPaths = findSwapPathsBetweenTokens(marketAdjacencyGraph);

const baseGasLimits: GasLimitsConfig = {
  decreaseOrder: 4000000n,
  depositToken: 1800000n,
  estimatedFeeMultiplierFactor: 1000000000000000000000000000000n,
  estimatedGasFeeBaseAmount: 600000n,
  estimatedGasFeePerOraclePrice: 250000n,
  glvDepositGasLimit: 2000000n,
  glvPerMarketGasLimit: 100000n,
  glvWithdrawalGasLimit: 2000000n,
  increaseOrder: 4000000n,
  shift: 2500000n,
  singleSwap: 1000000n,
  swapOrder: 3000000n,
  withdrawalMultiToken: 1500000n,
};

const baseGasPrice = 1650000002n;

describe("mockRouting", () => {
  it("selects SPOT [USDC-DAI] path for USDC->DAI swap when pool has excess of DAI", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          marketKey,
          longPoolAmount: usdToToken(1000, baseMarketsInfoData[marketKey].longToken),
          shortPoolAmount: usdToToken(1000, baseMarketsInfoData[marketKey].shortToken),
        },
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      "SPOT-USDC-DAI": {
        longPoolAmount: usdToToken(600, tokensData.USDC),
        shortPoolAmount: usdToToken(1100, tokensData.DAI),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "USDC", "DAI");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "USDC",
      tokenOutAddress: "DAI",
      estimator,
      usdIn: expandDecimals(100n, USD_DECIMALS),
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["SPOT-USDC-DAI"]);
  });

  it("selects SPOT [DAI-USDC] path for USDC->DAI swap when pool has excess of USDC", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          marketKey,
          longPoolAmount: usdToToken(1000, tokensData.DAI),
          shortPoolAmount: usdToToken(1000, tokensData.USDC),
        },
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      "SPOT-DAI-USDC": {
        longPoolAmount: usdToToken(1100, tokensData.USDC),
        shortPoolAmount: usdToToken(600, tokensData.DAI),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "USDC", "DAI");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "USDC",
      tokenOutAddress: "DAI",
      estimator,
      usdIn: expandDecimals(100n, USD_DECIMALS),
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["SPOT-DAI-USDC"]);
  });

  it("routes through BTC [BTC-USDC] -> SOL [BTC-USDC] -> BTC [BTC-DAI] for optimal pricing", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          longPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].longToken),
          maxLongPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].longToken),
          shortPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].shortToken),
          maxShortPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].shortToken),
        } satisfies Partial<MarketInfo>,
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      // Desired swaps BTC -> USDC, USDC -> BTC, BTC -> DAI
      // 1st desired swap BTC -> USDC, profitable
      "BTC-BTC-USDC": {
        longPoolAmount: usdToToken(60_000, tokensData.BTC),
        shortPoolAmount: usdToToken(120_000, tokensData.USDC),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
      // 2nd desired swap USDC -> BTC, back to BTC but profitable
      "SOL-BTC-USDC": {
        longPoolAmount: usdToToken(120_000, tokensData.BTC),
        shortPoolAmount: usdToToken(60_000, tokensData.USDC),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
      // 3d desired swap BTC -> DAI, just balanced
      "BTC-BTC-DAI": {
        longPoolAmount: usdToToken(100_000, tokensData.BTC),
        shortPoolAmount: usdToToken(100_000, tokensData.DAI),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.DAI),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "BTC", "DAI");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "BTC",
      tokenOutAddress: "DAI",
      estimator,
      usdIn: expandDecimals(30_000n, USD_DECIMALS),
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["BTC-BTC-USDC", "SOL-BTC-USDC", "BTC-BTC-DAI"]);
  });

  it("routes USDC-BTC through BTC [BTC-USDC] -> SOL [BTC-USDC] -> BTC [BTC-USDC] for imbalanced liquidity", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          longPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].longToken),
          shortPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].shortToken),
          maxLongPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].longToken),
          maxShortPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].shortToken),
        } satisfies Partial<MarketInfo>,
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      // Desired swap USDC -> BTC -> USDC -> BTC, but first and third steps are through BTC-BTC-USDC
      // 1st and 3rd desired swap USDC -> BTC, profitable
      "BTC-BTC-USDC": {
        // Huge imbalance
        longPoolAmount: usdToToken(120_000, tokensData.BTC),
        shortPoolAmount: usdToToken(20_000, tokensData.USDC),

        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
      // 2nd desired swap BTC -> USDC, back to BTC but profitable
      "SOL-BTC-USDC": {
        longPoolAmount: usdToToken(70_000, tokensData.BTC),
        shortPoolAmount: usdToToken(100_000, tokensData.USDC),

        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "USDC", "BTC");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "USDC",
      tokenOutAddress: "BTC",
      estimator,
      usdIn: expandDecimals(30_000n, USD_DECIMALS),
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["BTC-BTC-USDC", "SOL-BTC-USDC", "BTC-BTC-USDC"]);
  });

  it("selects BTC [BTC-USDC] direct path when impact factors penalize multi-hop routes", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          // ensure non relevant markets have enough liquidity, so that test includes all relevant markets but chooses desired
          longPoolAmount: usdToToken(500_000, baseMarketsInfoData[marketKey].longToken),
          shortPoolAmount: usdToToken(500_000, baseMarketsInfoData[marketKey].shortToken),
          maxLongPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].longToken),
          maxShortPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].shortToken),
        } satisfies Partial<MarketInfo>,
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      // Desired swap USDC -> BTC. even with huge imbalance because second swap through BTC-BTC-USDC would be bad
      // 1st and 3rd desired swap USDC -> BTC, profitable
      "BTC-BTC-USDC": {
        // Huge imbalance
        longPoolAmount: usdToToken(150_000, tokensData.BTC),
        shortPoolAmount: usdToToken(20_000, tokensData.USDC),

        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),

        swapImpactFactorPositive: expandDecimals(1, 23),
        // Punish super hard for worsening price impact
        swapImpactFactorNegative: expandDecimals(3, 23),
      },
      // trap step to trick algorithm into picking 3 step path
      "SOL-BTC-USDC": {
        longPoolAmount: usdToToken(80_000, tokensData.BTC),
        shortPoolAmount: usdToToken(100_000, tokensData.USDC),

        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),

        swapImpactFactorPositive: expandDecimals(1, 23),
        // Punish super hard for worsening price impact
        swapImpactFactorNegative: expandDecimals(3, 23),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "USDC", "BTC");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "USDC",
      tokenOutAddress: "BTC",
      estimator,
      usdIn: expandDecimals(70_000n, USD_DECIMALS),
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["BTC-BTC-USDC"]);
  });

  it("selects BTC [BTC-DAI] direct path when high gas fees outweigh multi-hop benefits", () => {
    const allPoolsBalanced = Object.fromEntries(
      marketKeys.map((marketKey) => [
        marketKey,
        {
          longPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].longToken),
          maxLongPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].longToken),
          shortPoolAmount: usdToToken(100_000, baseMarketsInfoData[marketKey].shortToken),
          maxShortPoolAmount: usdToToken(1_000_000, baseMarketsInfoData[marketKey].shortToken),
        } satisfies Partial<MarketInfo>,
      ])
    );

    const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys, {
      ...allPoolsBalanced,
      // Desired swaps BTC -> USDC, USDC -> BTC, BTC -> DAI
      // 1st desired swap BTC -> USDC, profitable
      "BTC-BTC-USDC": {
        longPoolAmount: usdToToken(60_000, tokensData.BTC),
        shortPoolAmount: usdToToken(120_000, tokensData.USDC),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
      // 2nd desired swap USDC -> BTC, back to BTC but profitable
      "SOL-BTC-USDC": {
        longPoolAmount: usdToToken(120_000, tokensData.BTC),
        shortPoolAmount: usdToToken(60_000, tokensData.USDC),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.USDC),
      },
      // 3d desired swap BTC -> DAI, just balanced
      "BTC-BTC-DAI": {
        longPoolAmount: usdToToken(100_000, tokensData.BTC),
        shortPoolAmount: usdToToken(100_000, tokensData.DAI),
        maxLongPoolAmount: usdToToken(1_000_000, tokensData.BTC),
        maxShortPoolAmount: usdToToken(1_000_000, tokensData.DAI),
      },
    });

    const tokenSwapPaths = getTokenSwapPathsForTokenPair(swapPaths, "BTC", "DAI");
    const estimator = createNaiveSwapEstimator(marketsInfoData);

    const fakeMultiplier = 100n;

    const networkEstimator = createNaiveNetworkEstimator({
      chainId: 1,
      gasLimits: {
        ...baseGasLimits,
        singleSwap: baseGasLimits.singleSwap * fakeMultiplier,
      },
      gasPrice: baseGasPrice * fakeMultiplier,
      tokensData: {
        ...tokensData,
        [NATIVE_TOKEN_ADDRESS]: {
          ...tokensData.ETH,
          address: NATIVE_TOKEN_ADDRESS,
        },
      },
    });

    const paths = getNaiveBestMarketSwapPathsFromTokenSwapPaths({
      graph: marketAdjacencyGraph,
      tokenSwapPaths,
      topPathsCount: 1,
      tokenInAddress: "BTC",
      tokenOutAddress: "DAI",
      estimator,
      usdIn: expandDecimals(30_000n, USD_DECIMALS),
      networkEstimator,
    });

    const topPath = paths?.[0];

    expect(topPath).toBeDefined();
    expect(topPath).toEqual(["BTC-BTC-DAI"]);
  });
});
