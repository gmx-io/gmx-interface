import { mockMarketsData } from "domain/synthetics/testUtils/mocks";
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

const marketsData = mockMarketsData(marketsKeys);
// const feeConfigs = mockFeeConfigsData(marketsKeys);

const graph = getMarketsGraph(Object.values(marketsData));

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

        const allPaths = findAllPaths(graph, from, to);

        const allPathsResult = allPaths?.map((path) => path.map((p) => p.marketAddress));
        let pathResult: string[] | undefined = undefined;

        if (allPaths) {
          const result = getBestSwapPath(allPaths, BigNumber.from(5), mockEstimator);
          pathResult = result?.map((p) => p.marketAddress);
        }

        expect(pathResult).toEqual(expected);
        expect(allPathsResult).toEqual(expectedPaths);
      });
    }
  });

  // describe("with fee estimaton", () => {
  //   const tests = [
  //     {
  //       name: "default by markets order",
  //       from: "ETH",
  //       to: "AVAX",
  //       expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
  //       expectedImpactDeltaUsd: BigNumber.from(0),
  //       poolsData: mockPoolsData(tokensData, marketsKeys),
  //       openInterestData: mockOpenInterestData(marketsData, tokensData),
  //       // ETH
  //       usdIn: expandDecimals(300, 30),
  //     },
  //     {
  //       name: "by negative price impact",
  //       from: "ETH",
  //       to: "AVAX",
  //       expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
  //       expectedImpactDeltaUsd: expandDecimals(-1, 27), // -0.001$
  //       poolsData: mockPoolsData(tokensData, marketsKeys, {
  //         "ETH-ETH-USDC": {
  //           // inbalanced
  //           longPoolAmount: expandDecimals(5, 18), // ETH
  //           shortPoolAmount: expandDecimals(1500, 6), // USDC
  //         },
  //         "SOL-ETH-USDC": {
  //           // balanced
  //           longPoolAmount: expandDecimals(5, 18), // ETH
  //           shortPoolAmount: expandDecimals(5000, 6), // USDC
  //         },
  //       }),
  //       openInterestData: mockOpenInterestData(marketsData, tokensData),
  //       // ETH
  //       usdIn: expandDecimals(300, 30),
  //     },
  //     {
  //       name: "by positive price impact",
  //       from: "ETH",
  //       to: "AVAX",
  //       expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
  //       expectedImpactDeltaUsd: expandDecimals(0, 30),
  //       poolsData: mockPoolsData(tokensData, marketsKeys, {
  //         "SOL-ETH-USDC": {
  //           // balanced
  //           longPoolAmount: expandDecimals(3, 18), // ETH
  //           shortPoolAmount: expandDecimals(4000, 6), // USDC
  //         },
  //       }),
  //       openInterestData: mockOpenInterestData(marketsData, tokensData),
  //       // ETH
  //       usdIn: expandDecimals(500, 30),
  //     },
  //     {
  //       name: "by liquidity",
  //       from: "ETH",
  //       to: "AVAX",
  //       expected: ["SOL-ETH-USDC", "AVAX-AVAX-USDC"],
  //       expectedImpactDeltaUsd: expandDecimals(0, 30),
  //       poolsData: mockPoolsData(tokensData, marketsKeys),
  //       openInterestData: mockOpenInterestData(marketsData, tokensData, {
  //         "ETH-ETH-USDC": {
  //           // High reserved USDC
  //           shortInterestInTokens: expandDecimals(1, 18), // ETH
  //         },
  //       }),
  //       // ETH
  //       usdIn: expandDecimals(500, 30),
  //     },
  //   ];

  //   for (const { name, from, to, expected, poolsData, usdIn, expectedImpactDeltaUsd, openInterestData } of tests) {
  //     it(`${name}: ${from} -> ${to}`, () => {
  //       const estimator = createSwapEstimator(marketsData, poolsData, openInterestData, tokensData, feeConfigs);

  //       const fromToken = getTokenData(tokensData, from)!;
  //       const amountIn = convertToTokenAmount(usdIn, fromToken.decimals, fromToken.prices?.minPrice);

  //       const result = findBestSwapPath(graph, from, to, usdIn, estimator);
  //       const path = result?.map((p) => p.marketAddress);
  //       const fees = getSwapPathStats(marketsData, poolsData, tokensData, feeConfigs, path, from, usdIn);

  //       expect(path).toEqual(expected);
  //       expect(formatUsd(fees?.totalPriceImpact.deltaUsd)).toEqual(formatUsd(expectedImpactDeltaUsd));
  //     });
  //   }
  // });
});
