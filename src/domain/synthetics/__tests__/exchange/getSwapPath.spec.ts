import {
  FeeEstimator,
  SwapParams,
  findSwapPath,
  getMarketsGraph,
  getSwapPathForPosition,
} from "domain/synthetics/exchange";
import { MarketsData, MarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber, ethers } from "ethers";

// indexToken-longToken-shortToken
const marketsKeys = [
  "AVAX-AVAX-USDC",
  "ETH-ETH-USDC",
  "ETH-ETH-DAI",
  "SOL-ETH-USDC",
  "BTC-BTC-DAI",
  "SPOT-USDC-DAI",
  "SPOT-DAI-USDC",
];

// market:indexToken:longToken:shortToken
const marketsCombinations = marketsKeys.map((key) => `${key}:${key.replaceAll("-", ":")}`);

const marketsData: MarketsData = marketsCombinations.reduce((acc, comb) => {
  const [market, indexToken, longToken, shortToken] = comb.split(":");

  acc[market] = {
    marketTokenAddress: market,
    shortTokenAddress: shortToken,
    longTokenAddress: longToken,
    indexTokenAddress: indexToken,
    perp: "USD",
    data: "",
  };

  return acc;
}, {} as MarketsData);

const graph = getMarketsGraph(marketsData);

const poolsData: MarketsPoolsData = marketsKeys.reduce((acc, market) => {
  acc[market] = {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(10),
  };

  return acc;
}, {});

// mocked estimator, only checks for pool amounts
const feeEstimatorFactory =
  (poolsData): FeeEstimator =>
  (marketAddress, from, to, amountUsd) => {
    const market = marketsData[marketAddress];
    const pools = poolsData[marketAddress];

    const toPool = to === market.longTokenAddress ? pools.longPoolAmount : pools.shortPoolAmount;

    if (!toPool || toPool.lt(amountUsd)) return ethers.constants.MaxUint256;

    return BigNumber.from(1);
  };

describe("getSwapPath", () => {
  describe("for swaps", () => {
    const tests = [
      {
        name: "the same market",
        from: "ETH",
        to: "USDC",
        amountUsd: BigNumber.from(5),
        expected: ["ETH-ETH-USDC"],
        expectedFee: BigNumber.from(1),
        poolsData,
      },
      {
        name: "the same market",
        from: "USDC",
        to: "ETH",
        amountUsd: BigNumber.from(5),
        expected: ["ETH-ETH-USDC"],
        expectedFee: BigNumber.from(1),
        poolsData,
      },
      {
        name: "different markets",
        from: "ETH",
        to: "AVAX",
        amountUsd: BigNumber.from(5),
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedFee: BigNumber.from(2),
        poolsData,
      },
      {
        name: "different markets via spot",
        from: "AVAX",
        to: "BTC",
        amountUsd: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
        expectedFee: BigNumber.from(3),
        poolsData,
      },
      // TODO: find shortest
      // {
      //   name: "different markets shortest via spot",
      //   from: "DAI",
      //   to: "AVAX",
      //   amountUsd: BigNumber.from(5),
      //   expected: ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
      //   poolsData,
      // },
      {
        name: "different markets via spot based on pools",
        from: "AVAX",
        to: "BTC",
        amountUsd: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
        expectedFee: BigNumber.from(3),
        poolsData: {
          ...poolsData,
          "SPOT-USDC-DAI": {
            longPoolAmount: BigNumber.from(0),
            shortPoolAmount: BigNumber.from(0),
          },
        },
      },
      {
        name: "different markets without spot based on pools",
        from: "AVAX",
        to: "DAI",
        amountUsd: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
        expectedFee: BigNumber.from(3),
        poolsData: {
          ...poolsData,
          "SPOT-USDC-DAI": {
            longPoolAmount: BigNumber.from(0),
            shortPoolAmount: BigNumber.from(0),
          },
          "SPOT-DAI-USDC": {
            longPoolAmount: BigNumber.from(0),
            shortPoolAmount: BigNumber.from(0),
          },
        },
      },
      {
        name: "Long -> Short via spot",
        from: "AVAX",
        to: "DAI",
        amountUsd: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
        expectedFee: BigNumber.from(2),
        poolsData,
      },
      {
        name: "no swapPath",
        from: "BTC",
        to: "USDT",
        amountUsd: BigNumber.from(5),
        expectedFee: undefined,
        expected: undefined,
        poolsData,
      },
    ];

    for (const { name, from, to, poolsData, amountUsd, expected, expectedFee } of tests) {
      it(`${name}: ${from} -> ${to}`, () => {
        const swapParams = {
          marketsData,
          poolsData,
          fromToken: from,
          toToken: to,
          amountUsd,
          feeEstimator: feeEstimatorFactory(poolsData),
          tokensData: {},
        };

        const result = findSwapPath(swapParams, graph);

        expect(result?.map((swap) => swap.market)).toEqual(expected);
        const fee = result?.reduce((acc, swap) => acc.add(swap.feeUsd), BigNumber.from(0));
        expect(fee).toEqual(expectedFee);
      });
    }
  });

  describe("for positions", () => {
    const tests = [
      {
        name: "without swap Long",
        from: "ETH",
        collateral: "ETH",
        index: "ETH",
        amountUsd: BigNumber.from(5),
        expectedPath: [],
        expectedMarket: "ETH-ETH-USDC",
        expectedFee: BigNumber.from(0),
        marketsCombinations,
        poolsData,
      },
      {
        name: "without swap Short",
        from: "USDC",
        collateral: "USDC",
        index: "ETH",
        amountUsd: BigNumber.from(5),
        expectedPath: [],
        expectedMarket: "ETH-ETH-USDC",
        expectedFee: BigNumber.from(0),
        marketsCombinations,
        poolsData,
      },
      {
        name: "the same market swap Long -> Short",
        from: "ETH",
        collateral: "USDC",
        index: "ETH",
        isLong: true,
        amountUsd: BigNumber.from(5),
        expectedPath: ["ETH-ETH-USDC"],
        expectedMarket: "ETH-ETH-USDC",
        expectedFee: BigNumber.from(1),
        marketsCombinations,
        poolsData,
      },
      {
        name: "the same market swap Short -> Long",
        from: "ETH",
        collateral: "USDC",
        index: "ETH",
        amountUsd: BigNumber.from(5),
        expectedPath: ["ETH-ETH-USDC"],
        expectedMarket: "ETH-ETH-USDC",
        expectedFee: BigNumber.from(1),
        marketsCombinations,
        poolsData,
      },
      // TODO: shortest
      // {
      //   name: "Long -> Short via spot",
      //   from: "ETH",
      //   collateral: "DAI",
      //   index: "BTC",
      //   amountUsd: BigNumber.from(1),
      //   expectedPath: ["ETH-ETH-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      //   marketsCombinations,
      //   poolsData,
      // },
      {
        name: "Long -> Long",
        from: "ETH",
        collateral: "AVAX",
        index: "AVAX",
        amountUsd: BigNumber.from(5),
        expectedPath: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedMarket: "AVAX-AVAX-USDC",
        expectedFee: BigNumber.from(2),
        marketsCombinations,
        poolsData,
      },
      {
        name: "Long -> Short",
        from: "ETH",
        collateral: "USDC",
        index: "AVAX",
        amountUsd: BigNumber.from(5),
        expectedPath: ["ETH-ETH-USDC", "AVAX-AVAX-USDC", "AVAX-AVAX-USDC"],
        expectedMarket: "AVAX-AVAX-USDC",
        expectedFee: BigNumber.from(3),
        marketsCombinations,
        poolsData,
      },
      {
        name: "no swapPath - invalid collateral",
        from: "ETH",
        collateral: "USDC",
        index: "BTC",
        amountUsd: BigNumber.from(5),
        expectedPath: undefined,
        expectedFee: undefined,
        expectedMarket: undefined,
        marketsCombinations,
        poolsData,
      },
    ];

    for (const { name, from, collateral, index, amountUsd, expectedPath, expectedMarket, expectedFee } of tests) {
      it(`${name}: ${from} -> ${collateral} : ${index}`, () => {
        const swapParams: SwapParams = {
          fromToken: from,
          toToken: collateral,
          indexToken: index,
          amountUsd,
          feeEstimator: feeEstimatorFactory(poolsData),
        };

        const result = getSwapPathForPosition(marketsData, swapParams, graph);

        expect(result?.swapPath.map((swap) => swap.market)).toEqual(expectedPath);
        expect(result?.market).toEqual(expectedMarket);

        const fee = result?.swapPath.reduce((acc, swap) => acc.add(swap.feeUsd), BigNumber.from(0));

        expect(fee).toEqual(expectedFee);
      });
    }
  });
});
