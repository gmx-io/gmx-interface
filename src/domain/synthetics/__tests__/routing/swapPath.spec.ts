import { MarketInfo } from "domain/synthetics/markets";
import { mockMarketsInfoData, mockTokensData } from "domain/synthetics/testUtils/mocks";
import {
  MarketEdge,
  SwapEstimator,
  findAllPaths,
  findAllReachableTokens,
  getBestSwapPath,
  getMarketsGraph,
} from "domain/synthetics/trade";
import { describe, expect, it } from "vitest";

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

const graph = getMarketsGraph(Object.values(marketsInfoData) as MarketInfo[]);

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
          ["SPOT-USDC-DAI", "SPOT-DAI-USDC", "ETH-ETH-USDC"],
          ["SPOT-USDC-DAI", "SPOT-DAI-USDC", "SOL-ETH-USDC"],
          ["SPOT-USDC-DAI", "ETH-ETH-DAI"],
          ["SPOT-DAI-USDC", "SPOT-USDC-DAI", "ETH-ETH-USDC"],
          ["SPOT-DAI-USDC", "SPOT-USDC-DAI", "SOL-ETH-USDC"],
          ["SPOT-DAI-USDC", "ETH-ETH-DAI"],
          ["ETH-ETH-USDC"],
          ["SOL-ETH-USDC"],
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
        expectedPaths: [],
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
        const allRoutes = findAllPaths(marketsInfoData, graph, from, to);

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

describe("findAllReachableTokens", () => {
  it("should work for common token ETH", () => {
    const fromTokenAddress = "ETH";

    const reachableTokens = findAllReachableTokens(graph, fromTokenAddress);

    expect(reachableTokens).toStrictEqual(["ETH", "USDC", "AVAX", "DAI", "BTC"]);
  });

  it("should work for unreachable token TBTC", () => {
    const fromTokenAddress = "TBTC";

    const reachableTokens = findAllReachableTokens(graph, fromTokenAddress);

    expect(reachableTokens).toStrictEqual(["TBTC"]);
  });

  it("should work for partially unreachable token TETH_A", () => {
    const fromTokenAddress = "TETH_A";

    const reachableTokens = findAllReachableTokens(graph, fromTokenAddress);

    expect(reachableTokens).toStrictEqual(["TETH_A", "TETH_B"]);
  });

  it("should work for partially reachable token TEST_B", () => {
    const fromTokenAddress = "TEST_B";

    const reachableTokens = findAllReachableTokens(graph, fromTokenAddress);

    expect(reachableTokens).toStrictEqual(["TEST_B", "TEST_A", "TEST_C"]);
  });
});
