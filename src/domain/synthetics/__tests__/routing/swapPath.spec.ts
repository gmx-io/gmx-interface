import { MarketInfo } from "domain/synthetics/markets";
import { mockMarketsInfoData, mockTokensData } from "domain/synthetics/testUtils/mocks";
import { MarketEdge, SwapEstimator, findAllPaths, getBestSwapPath, getMarketsGraph } from "domain/synthetics/trade";
import { BigNumber } from "ethers";

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
];

const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, marketsKeys);

const graph = getMarketsGraph(Object.values(marketsInfoData) as MarketInfo[]);

const BASE_FEE = BigNumber.from(-1);

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
          ["ETH-ETH-DAI", "SPOT-USDC-DAI"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC"],
          ["SOL-ETH-USDC"],
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
          ["SPOT-USDC-DAI", "SPOT-DAI-USDC", "ETH-ETH-USDC"],
          ["SPOT-USDC-DAI", "SPOT-DAI-USDC", "SOL-ETH-USDC"],
          ["SPOT-DAI-USDC", "ETH-ETH-DAI"],
          ["SPOT-DAI-USDC", "SPOT-USDC-DAI", "ETH-ETH-USDC"],
          ["SPOT-DAI-USDC", "SPOT-USDC-DAI", "SOL-ETH-USDC"],
        ],
      },
      {
        name: "different markets",
        from: "ETH",
        to: "AVAX",
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
          ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
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
          ["ETH-ETH-DAI", "ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SOL-ETH-USDC", "AVAX-AVAX-USDC"],
          ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
        ],
      },
      {
        name: "different markets via spot by lowest fee",
        from: "AVAX",
        to: "BTC",
        feeOverrides: {
          "SPOT-USDC-DAI": {
            "USDC-DAI": BASE_FEE.sub(10),
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
            "USDC-DAI": BASE_FEE.sub(10),
          },
          "SPOT-DAI-USDC": {
            "USDC-DAI": BASE_FEE.sub(2),
          },
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE.sub(2),
          },
        },
        expected: ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
        expectedPaths: [
          ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SOL-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC"],
        ],
      },
      {
        name: "different markets with positive fee",
        from: "ETH",
        to: "AVAX",
        feeOverrides: {
          "SOL-ETH-USDC": {
            "ETH-USDC": BASE_FEE.mul(-1),
          },
        },
        expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedPaths: [
          ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
          ["ETH-ETH-DAI", "SPOT-DAI-USDC", "AVAX-AVAX-USDC"],
          ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
        ],
      },
      {
        name: "Long -> Short via spot",
        from: "AVAX",
        to: "DAI",
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
        expectedFee: BigNumber.from(-2),
        expectedPaths: [
          ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SOL-ETH-USDC", "ETH-ETH-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
          ["AVAX-AVAX-USDC", "SPOT-DAI-USDC"],
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
        const mockEstimator: SwapEstimator = (e: MarketEdge, usdIn: BigNumber) => {
          const fees = feeOverrides?.[e.marketAddress]?.[`${e.from}-${e.to}`] || BASE_FEE;
          return {
            usdOut: usdIn.add(fees),
          };
        };
        const allRoutes = findAllPaths(marketsInfoData, graph, from, to);

        const allPathsResult = allRoutes?.map((route) => route.path);

        let pathResult: string[] | undefined = undefined;

        if (allRoutes) {
          const result = getBestSwapPath(allRoutes, BigNumber.from(5), mockEstimator);
          pathResult = result;
        }

        expect(pathResult).toEqual(expected);
        expect(allPathsResult).toEqual(expectedPaths);
      });
    }
  });
});
