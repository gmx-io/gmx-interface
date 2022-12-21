import {
  findSwapPath,
  getMarketsGraph,
  getSwapParamsForPosition,
  parseMarketCombination,
} from "domain/synthetics/exchange";
import { MarketsData, MarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";

const markets = [
  "AVAX-AVAX-USDC",
  "ETH-ETH-USDC",
  "ETH-ETH-DAI",
  "SOL-ETH-USDC",
  "BTC-BTC-DAI",
  "SPOT-USDC-DAI",
  "SPOT-DAI-USDC",
];

// format: market:longToken:shortToken:indexToken
const marketsCombinations = markets.map((market) => `${market}:${market.replaceAll("-", ":")}`);

const { collateralsGraph } = getMarketsGraph(marketsCombinations);

const marketsData: MarketsData = marketsCombinations.reduce((acc, comb) => {
  const { market, longToken, shortToken, indexToken } = parseMarketCombination(comb);

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
const poolsData: MarketsPoolsData = markets.reduce((acc, market) => {
  acc[market] = {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(10),
  };

  return acc;
}, {});

describe("getSwapPath", () => {
  describe("for swaps", () => {
    const tests = [
      {
        name: "the same market",
        from: "ETH",
        to: "USDC",
        amount: BigNumber.from(5),
        expected: ["ETH-ETH-USDC"],
        poolsData,
      },
      {
        name: "the same market",
        from: "USDC",
        to: "ETH",
        amount: BigNumber.from(5),
        expected: ["ETH-ETH-USDC"],
        poolsData,
      },
      {
        name: "different markets",
        from: "ETH",
        to: "AVAX",
        amount: BigNumber.from(5),
        expected: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        poolsData,
      },
      {
        name: "different markets via spot",
        from: "AVAX",
        to: "BTC",
        amount: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
        poolsData,
      },
      // {
      //   name: "different markets shortest via spot",
      //   from: "DAI",
      //   to: "AVAX",
      //   amount: BigNumber.from(5),
      //   expected: ["SPOT-USDC-DAI", "AVAX-AVAX-USDC"],
      //   poolsData,
      // },
      {
        name: "different markets via spot based on pools",
        from: "AVAX",
        to: "BTC",
        amount: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-DAI-USDC", "BTC-BTC-DAI"],
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
        amount: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "ETH-ETH-USDC", "ETH-ETH-DAI"],
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
        amount: BigNumber.from(5),
        expected: ["AVAX-AVAX-USDC", "SPOT-USDC-DAI"],
        poolsData,
      },
      {
        name: "no swapPath",
        from: "BTC",
        to: "USDT",
        amount: BigNumber.from(5),
        expected: undefined,
        poolsData,
      },
    ];

    for (const { name, from, to, poolsData, amount, expected } of tests) {
      it(`${name}: ${from} -> ${to}`, () => {
        const result = findSwapPath({ marketsData, poolsData, fromToken: from, toToken: to, amount }, collateralsGraph);

        expect(result?.map((swap) => swap.market)).toEqual(expected);
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
        amount: BigNumber.from(1),
        expectedPath: [],
        expectedMarket: "ETH-ETH-USDC",
        marketsCombinations,
        poolsData,
      },
      {
        name: "without swap Short",
        from: "USDC",
        collateral: "USDC",
        index: "ETH",
        amount: BigNumber.from(1),
        expectedPath: [],
        expectedMarket: "ETH-ETH-USDC",
        marketsCombinations,
        poolsData,
      },
      {
        name: "the same market swap Long -> Short",
        from: "ETH",
        collateral: "USDC",
        index: "ETH",
        isLong: true,
        amount: BigNumber.from(1),
        expectedPath: ["ETH-ETH-USDC"],
        expectedMarket: "ETH-ETH-USDC",
        marketsCombinations,
        poolsData,
      },
      {
        name: "the same market swap Short -> Long",
        from: "ETH",
        collateral: "USDC",
        index: "ETH",
        amount: BigNumber.from(1),
        expectedPath: ["ETH-ETH-USDC"],
        expectedMarket: "ETH-ETH-USDC",
        marketsCombinations,
        poolsData,
      },
      // TODO: shortest
      // {
      //   name: "Long -> Short via spot",
      //   from: "ETH",
      //   collateral: "DAI",
      //   index: "BTC",
      //   amount: BigNumber.from(1),
      //   expectedPath: ["ETH-ETH-USDC", "SPOT-USDC-DAI", "BTC-BTC-DAI"],
      //   marketsCombinations,
      //   poolsData,
      // },
      {
        name: "Long -> Long",
        from: "ETH",
        collateral: "AVAX",
        index: "AVAX",
        amount: BigNumber.from(1),
        expectedPath: ["ETH-ETH-USDC", "AVAX-AVAX-USDC"],
        expectedMarket: "AVAX-AVAX-USDC",
        marketsCombinations,
        poolsData,
      },
      {
        name: "Long -> Short",
        from: "ETH",
        collateral: "USDC",
        index: "AVAX",
        amount: BigNumber.from(1),
        expectedPath: ["ETH-ETH-USDC", "AVAX-AVAX-USDC", "AVAX-AVAX-USDC"],
        expectedMarket: "AVAX-AVAX-USDC",
        marketsCombinations,
        poolsData,
      },
      {
        name: "no swapPath invalid collateral",
        from: "ETH",
        collateral: "USDC",
        index: "BTC",
        amount: BigNumber.from(1),
        expectedPath: undefined,
        marketsCombinations,
        poolsData,
      },
    ];

    for (const { name, from, collateral, index, poolsData, amount, expectedPath, expectedMarket } of tests) {
      it(`${name}: ${from} -> ${collateral} : ${index}`, () => {
        const swapData = { marketsData, poolsData, fromToken: from, toToken: collateral, indexToken: index, amount };

        const result = getSwapParamsForPosition(swapData, collateralsGraph);

        expect(result?.swapPath.map((swap) => swap.market)).toEqual(expectedPath);
        expect(result?.market).toEqual(expectedMarket);
      });
    }
  });
});
