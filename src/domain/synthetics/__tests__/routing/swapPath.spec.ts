import { describe, expect, it } from "vitest";

import { mockMarketsInfoData, mockTokensData } from "domain/synthetics/testUtils/mocks";
import { MarketEdge, SwapEstimator, SwapRoutes, findAllPaths, getBestSwapPath } from "domain/synthetics/trade";

const marketsKeys = [
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

const tokensData = mockTokensData({
  TBTC: {
    address: "TBTC",
    decimals: 18,
    name: "tBTC",
    symbol: "TBTC",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
  TEST_A: {
    address: "TEST_A",
    decimals: 18,
    name: "Test A",
    symbol: "TEST_A",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
  TEST_B: {
    address: "TEST_B",
    decimals: 18,
    name: "Test B",
    symbol: "TEST_B",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
  TEST_C: {
    address: "TEST_C",
    decimals: 18,
    name: "Test C",
    symbol: "TEST_C",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
  TETH_A: {
    address: "TETH_A",
    decimals: 18,
    name: "tETH A",
    symbol: "TETH_A",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
  TETH_B: {
    address: "TETH_B",
    decimals: 18,
    name: "tETH B",
    symbol: "TETH_B",
    prices: {
      minPrice: BigInt(1),
      maxPrice: BigInt(1),
    },
  },
});
const marketsInfoData = mockMarketsInfoData(tokensData, marketsKeys);

const swapRoutes: SwapRoutes = {
  AVAX: {
    USDC: [["AVAX-AVAX-USDC"]],
    ETH: [
      ["AVAX-AVAX-USDC", "ETH-ETH-USDC"],
      ["AVAX-AVAX-USDC", "SOL-ETH-USDC"],
      ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "ETH-ETH-DAI"],
      ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "ETH-ETH-DAI"],
    ],
    BTC: [
      ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
    ],
    DAI: [
      ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
      ["AVAX-AVAX-USDC", "SPOT-DAI-USDC"],
      ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
      ["AVAX-AVAX-USDC", "SOL-ETH-USDC", "ETH-ETH-DAI"],
    ],
  },
  USDC: {
    ETH: [["ETH-ETH-USDC"], ["SOL-ETH-USDC"], ["SPOT-USDC-DAI", "ETH-ETH-DAI"], ["SPOT-DAI-USDC", "ETH-ETH-DAI"]],
    BTC: [
      ["SPOT-USDC-DAI", "BTC-BTC-DAI"],
      ["SPOT-DAI-USDC", "BTC-BTC-DAI"],
      ["ETH-ETH-USDC", "ETH-ETH-DAI", "BTC-BTC-DAI"],
      ["SOL-ETH-USDC", "ETH-ETH-DAI", "BTC-BTC-DAI"],
    ],
    DAI: [["SPOT-USDC-DAI"], ["SPOT-DAI-USDC"], ["ETH-ETH-USDC", "ETH-ETH-DAI"], ["SOL-ETH-USDC", "ETH-ETH-DAI"]],
  },
  ETH: {
    BTC: [
      ["ETH-ETH-DAI", "BTC-BTC-DAI"],
      ["ETH-ETH-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      ["ETH-ETH-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
      ["SOL-ETH-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      ["SOL-ETH-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
    ],
    DAI: [
      ["ETH-ETH-DAI"],
      ["ETH-ETH-USDC", "SPOT-USDC-DAI"],
      ["ETH-ETH-USDC", "SPOT-DAI-USDC"],
      ["SOL-ETH-USDC", "SPOT-USDC-DAI"],
      ["SOL-ETH-USDC", "SPOT-DAI-USDC"],
    ],
  },
  BTC: { DAI: [["BTC-BTC-DAI"]] },
  TEST_A: { TEST_B: [["TEST_B-TEST_B-TEST_A"]], TEST_C: [["TEST_C-TEST_C-TEST_A"]] },
  TEST_B: { TEST_C: [["TEST_B-TEST_B-TEST_A", "TEST_C-TEST_C-TEST_A"]] },
  TETH_A: { TETH_B: [["TETH_A-TETH_A-TETH_B"]] },
};

const BASE_FEE = BigInt(-1);

describe("swapPath", () => {
  describe("basic graph traversal", () => {
    const tests = [
      {
        name: "the same market",
        from: "ETH",
        to: "USDC",
        expected: ["ETH-ETH-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC"],
          ["SOL-ETH-USDC"],
          ["ETH-ETH-DAI", "SPOT-USDC-DAI"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC"],
        ],
      },
      {
        name: "the same market",
        from: "USDC",
        to: "ETH",
        expected: ["ETH-ETH-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC"],
          ["SOL-ETH-USDC"],
          ["SPOT-USDC-DAI", "ETH-ETH-DAI"],
          ["SPOT-DAI-USDC", "ETH-ETH-DAI"],
        ],
      },
      {
        name: "different markets",
        from: "ETH",
        to: "AVAX",
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
        ],
      },
      {
        name: "different markets via spot",
        from: "AVAX",
        to: "BTC",
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
        expectedPaths: [
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
        ],
      },
      {
        name: "different markets shortest via spot",
        from: "DAI",
        to: "AVAX",
        expected: ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
        expectedPaths: [
          ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        ],
      },
      {
        name: "different markets via spot by lowest fee",
        from: "AVAX",
        to: "BTC",
        feeOverrides: {
          "SPOT-USDC-DAI": {
            "USDC-DAI": BASE_FEE - 10n,
          },
        },
        expected: ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
        expectedPaths: [
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
        ],
      },
      {
        name: "different markets without spot by lowest fee",
        from: "AVAX",
        to: "DAI",
        feeOverrides: {
          "SPOT-USDC-DAI": {
            "USDC-DAI": BASE_FEE - 10n,
          },
          "SPOT-DAI-USDC": {
            "USDC-DAI": BASE_FEE - 2n,
          },
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE - 2n,
          },
        },
        expected: ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
        expectedPaths: [
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC"],
          ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SOL-ETH-USDC", "ETH-ETH-DAI"],
        ],
      },
      {
        name: "different markets with positive fee",
        from: "ETH",
        to: "AVAX",
        feeOverrides: {
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE * -1n,
          },
        },
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
        ],
      },
      {
        name: "Long -> Short via spot",
        from: "AVAX",
        to: "DAI",
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
        expectedFee: BigInt(-2),
        expectedPaths: [
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC"],
          ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SOL-ETH-USDC", "ETH-ETH-DAI"],
        ],
      },
      {
        name: "no swapPath",
        from: "BTC",
        to: "USDT",
        expectedFee: undefined,
        expected: undefined,
        expectedPaths: undefined,
      },
    ];
    for (const { name, from, to, expected, feeOverrides, expectedPaths } of tests) {
      it(`${name}: ${from} -> ${to}`, () => {
        const mockEstimator: SwapEstimator = (e: MarketEdge, usdIn: bigint) => {
          const fees: bigint = feeOverrides?.[e.marketAddress]?.[`${e.from}-${e.to}`] ?? BASE_FEE;
          return {
            usdOut: usdIn + fees,
          };
        };
        const allRoutes = findAllPaths({ marketsInfoData, chainId: 1, overrideSwapRoutes: swapRoutes, from, to });

        const allPathsResult = allRoutes?.map((route) => route.path);

        let pathResult: string[] | undefined = undefined;

        if (allRoutes) {
          const result = getBestSwapPath(allRoutes, BigInt(5), mockEstimator);
          pathResult = result;
        }

        expect(pathResult).toEqual(expected);
        expect(allPathsResult).toEqual(expectedPaths);
      });
    }
  });
});
