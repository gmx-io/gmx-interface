import { getPositionMarketsPath, getSwapPath } from "domain/synthetics/exchange";
import { MarketsData, MarketsPoolsData } from "domain/synthetics/markets";
import { BigNumber } from "ethers";

const marketsData: MarketsData = {
  ETHUSDC: {
    marketTokenAddress: "ETHUSDC",
    indexTokenAddress: "ETH",
    longTokenAddress: "ETH",
    shortTokenAddress: "USDC",
    perp: "USD",
    data: "",
  },
  AVAXUSDC: {
    marketTokenAddress: "AVAXUSDC",
    indexTokenAddress: "AVAX",
    longTokenAddress: "AVAX",
    shortTokenAddress: "USDC",
    perp: "USD",
    data: "",
  },
  BTCUSDC: {
    marketTokenAddress: "BTCUSDC",
    indexTokenAddress: "BTC",
    longTokenAddress: "BTC",
    shortTokenAddress: "USDC",
    perp: "USD",
    data: "",
  },
  BTCDAI: {
    marketTokenAddress: "BTCDAI",
    indexTokenAddress: "",
    longTokenAddress: "BTC",
    shortTokenAddress: "DAI",
    perp: "USD",
    data: "",
  },
};

const marketsData2: MarketsData = {
  ETHUSDC: {
    marketTokenAddress: "ETHUSDC",
    indexTokenAddress: "ETH",
    longTokenAddress: "ETH",
    shortTokenAddress: "USDC",
    perp: "USD",
    data: "",
  },
  AVAXUSDC: {
    marketTokenAddress: "AVAXUSDC",
    indexTokenAddress: "AVAX",
    longTokenAddress: "AVAX",
    shortTokenAddress: "USDC",
    perp: "USD",
    data: "",
  },
};

const poolsData: MarketsPoolsData = {
  ETHUSDC: {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(10),
  },
  AVAXUSDC: {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(20),
  },
  BTCUSDC: {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(10),
  },
  BTCDAI: {
    longPoolAmount: BigNumber.from(10),
    shortPoolAmount: BigNumber.from(10),
  },
};

describe("getSwapPath", () => {
  describe("for swaps", () => {
    it("the same market swap Long -> Short", () => {
      const result = getSwapPath(marketsData, poolsData, "ETH", "USDC", BigNumber.from(1));
      expect(result).toEqual(["ETHUSDC"]);
    });

    it("the same market swap Short -> Long", () => {
      const result = getSwapPath(marketsData, poolsData, "USDC", "ETH", BigNumber.from(1));
      expect(result).toEqual(["ETHUSDC"]);
    });

    it("different markets swap Long -> Long", () => {
      const result = getSwapPath(marketsData, poolsData, "ETH", "AVAX", BigNumber.from(1));
      expect(result).toEqual(["ETHUSDC", "AVAXUSDC", "AVAXUSDC"]);
    });

    it("different markets swap Long -> Short based on pools", () => {
      const result = getSwapPath(marketsData, poolsData, "ETH", "USDC", BigNumber.from(15));
      expect(result).toEqual(["ETHUSDC", "AVAXUSDC"]);
    });

    // TODO: need graphs?
    //   it("different market swap Long -> Short", () => {
    //     const result = getSwapPath(marketsData, poolsData, "ETH", "DAI", BigNumber.from(0));
    //     expect(result).toEqual(["ETHUSDC", "BTCUSDC", "BTCUSDC", "BTCDAI"]);
    //   });

    //   it("different market swap Short -> Short", () => {
    //     const result = getSwapPath(marketsData, poolsData, "USDC", "DAI", BigNumber.from(0));
    //     expect(result).toEqual(["ETHUSDC", "BTCUSDC", "BTCDAI"]);
    //   });

    //   it("different market swap Short -> Long", () => {
    //     const result = getSwapPath(marketsData, poolsData, "DAI", "ETH", BigNumber.from(0));
    //     expect(result).toEqual(["BTCDAI", "BTCUSDC", "ETHUSDC", "ETHUSDC"]);
    //   });
  });

  describe("for positions", () => {
    it("the same market Long", () => {
      const result = getPositionMarketsPath(marketsData2, poolsData, "ETH", "ETH", BigNumber.from(15));
      expect(result).toEqual(["ETHUSDC"]);
    });

    it("the same market Short", () => {
      const result = getPositionMarketsPath(marketsData2, poolsData, "USDC", "ETH", BigNumber.from(15));
      expect(result).toEqual(["ETHUSDC"]);
    });

    it("different markets Long", () => {
      const result = getPositionMarketsPath(marketsData2, poolsData, "ETH", "AVAX", BigNumber.from(15));
      expect(result).toEqual(["ETHUSDC", "AVAXUSDC"]);
    });
  });
});
