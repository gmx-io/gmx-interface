import { getTotalSwapFees } from "domain/synthetics/fees";
import { Edge, SwapEstimator } from "domain/synthetics/routing/types";
import { createSwapEstimator, findBestSwapPath, getMarketsGraph } from "domain/synthetics/routing/utils";
import {
  mockFeeConfigsData,
  mockMarketsData,
  mockOpenInterestData,
  mockPoolsData,
  mockTokensData,
} from "domain/synthetics/testUtils/mocks";
import { convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { expandDecimals, formatUsd } from "lib/numbers";

const marketsKeys = [
  "AVAX-AVAX-USDC",
  "ETH-ETH-USDC",
  "ETH-ETH-DAI",
  "ETH-USDC-USDC",
  "SOL-ETH-USDC",
  "BTC-BTC-DAI",
  "SPOT-USDC-DAI",
  "SPOT-DAI-USDC",
];

const marketsData = mockMarketsData(marketsKeys);
const tokensData = mockTokensData();
const feeConfigs = mockFeeConfigsData(marketsKeys);

const graph = getMarketsGraph(marketsData);

const BASE_FEE = BigNumber.from(1);

describe("swapPath", () => {
  describe("basic graph traversal", () => {
    const tests = [
      {
        name: "the same market",
        from: "ETH",
        to: "USDC",
        expected: ["ETH-ETH-USDC"],
      },
      {
        name: "the same market",
        from: "USDC",
        to: "ETH",
        expected: ["ETH-ETH-USDC"],
      },
      {
        name: "different markets",
        from: "ETH",
        to: "AVAX",
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
      },
      {
        name: "different markets via spot",
        from: "AVAX",
        to: "BTC",
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      },
      {
        name: "different markets shortest via spot",
        from: "DAI",
        to: "AVAX",
        expected: ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
      },
      {
        name: "different markets via spot by lowest fee",
        from: "AVAX",
        to: "BTC",
        expected: ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
        feeOverrides: {
          "SPOT-USDC-DAI": {
            "USDC-DAI": BASE_FEE.add(10),
          },
        },
      },
      {
        name: "different markets without spot by lowest fee",
        from: "AVAX",
        to: "DAI",
        expected: ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
        feeOverrides: {
          "SPOT-USDC-DAI": {
            "USDC-DAI": BASE_FEE.add(10),
          },
          "SPOT-DAI-USDC": {
            "USDC-DAI": BASE_FEE.add(2),
          },
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE.add(2),
          },
        },
      },
      {
        name: "different markets with negative fee",
        from: "ETH",
        to: "AVAX",
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        feeOverrides: {
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE.mul(-1),
          },
        },
      },
      {
        name: "Long -> Short via spot",
        from: "AVAX",
        to: "DAI",
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
      },
      {
        name: "no swapPath",
        from: "BTC",
        to: "USDT",
        expectedFee: undefined,
        expected: undefined,
        allPaths: [],
      },
    ];
    for (const { name, from, to, expected, feeOverrides } of tests) {
      it(`${name}: ${from} -> ${to}`, () => {
        const mockEstimator: SwapEstimator = (e: Edge, usdIn: BigNumber) => {
          const fees = feeOverrides?.[e.marketAddress]?.[`${e.from}-${e.to}`] || BASE_FEE;

          return {
            usdOut: usdIn.sub(fees),
            fees,
          };
        };

        const result = findBestSwapPath(graph, from, to, BigNumber.from(5), mockEstimator);

        const path = result?.map((p) => p.marketAddress);

        expect(expected).toEqual(path);
      });
    }
  });

  describe("with fee estimaton", () => {
    const tests = [
      {
        name: "default by markets order",
        from: "ETH",
        to: "AVAX",
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedImpactDeltaUsd: BigNumber.from(0),
        poolsData: mockPoolsData(tokensData, marketsKeys),
        openInterestData: mockOpenInterestData(marketsData, tokensData),
        // ETH
        usdIn: expandDecimals(300, 30),
      },
      {
        name: "by negative price impact",
        from: "ETH",
        to: "AVAX",
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedImpactDeltaUsd: expandDecimals(-1, 27), // -0.001$
        poolsData: mockPoolsData(tokensData, marketsKeys, {
          "ETH-ETH-USDC": {
            // inbalanced
            longPoolAmount: expandDecimals(5, 18), // ETH
            shortPoolAmount: expandDecimals(1500, 6), // USDC
          },
          "SOL-ETH-USDC": {
            // balanced
            longPoolAmount: expandDecimals(5, 18), // ETH
            shortPoolAmount: expandDecimals(5000, 6), // USDC
          },
        }),
        openInterestData: mockOpenInterestData(marketsData, tokensData),
        // ETH
        usdIn: expandDecimals(300, 30),
      },
      {
        name: "by positive price impact",
        from: "ETH",
        to: "AVAX",
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedImpactDeltaUsd: expandDecimals(0, 30),
        poolsData: mockPoolsData(tokensData, marketsKeys, {
          "SOL-ETH-USDC": {
            // balanced
            longPoolAmount: expandDecimals(3, 18), // ETH
            shortPoolAmount: expandDecimals(4000, 6), // USDC
          },
        }),
        openInterestData: mockOpenInterestData(marketsData, tokensData),
        // ETH
        usdIn: expandDecimals(500, 30),
      },
      {
        name: "by liquidity",
        from: "ETH",
        to: "AVAX",
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedImpactDeltaUsd: expandDecimals(0, 30),
        poolsData: mockPoolsData(tokensData, marketsKeys),
        openInterestData: mockOpenInterestData(marketsData, tokensData, {
          "ETH-ETH-USDC": {
            // High reserved USDC
            shortInterestInTokens: expandDecimals(1, 18), // ETH
          },
        }),
        // ETH
        usdIn: expandDecimals(500, 30),
      },
    ];

    for (const { name, from, to, expected, poolsData, usdIn, expectedImpactDeltaUsd, openInterestData } of tests) {
      it(`${name}: ${from} -> ${to}`, () => {
        const estimator = createSwapEstimator(marketsData, poolsData, openInterestData, tokensData, feeConfigs);

        const fromToken = getTokenData(tokensData, from)!;
        const amountIn = convertToTokenAmount(usdIn, fromToken.decimals, fromToken.prices?.minPrice);

        const result = findBestSwapPath(graph, from, to, usdIn, estimator);
        const path = result?.map((p) => p.marketAddress);
        const fees = getTotalSwapFees(marketsData, poolsData, tokensData, feeConfigs, path, from, amountIn);

        expect(path).toEqual(expected);
        expect(formatUsd(fees?.totalPriceImpact.deltaUsd)).toEqual(formatUsd(expectedImpactDeltaUsd));
      });
    }
  });
});
