import { TradeType } from "domain/synthetics/trade/types";
import { chooseSuitableMarket } from "domain/synthetics/markets/chooseSuitableMarket";

type Input = Parameters<typeof chooseSuitableMarket>[0];

describe("chooseSuitableMarket", () => {
  describe("without existing positions", () => {
    it("should should choose market with largest long liquidity pool if long is preferred", () => {
      const input: Input = {
        maxLongLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x2",
          maxLongLiquidity: BigInt(101),
          maxShortLiquidity: BigInt(99),
        },
        maxShortLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x3",
          maxLongLiquidity: BigInt(99),
          maxShortLiquidity: BigInt(101),
        },
        indexTokenAddress: "0x1",
        preferredTradeType: TradeType.Long,
      };

      const result = chooseSuitableMarket(input);

      expect(result).toEqual({
        indexTokenAddress: "0x1",
        marketTokenAddress: "0x2",
        tradeType: TradeType.Long,
      });
    });

    it("should should choose market with largest short liquidity pool if short is preferred", () => {
      const input: Input = {
        maxLongLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x2",
          maxLongLiquidity: BigInt(101),
          maxShortLiquidity: BigInt(99),
        },
        maxShortLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x3",
          maxLongLiquidity: BigInt(99),
          maxShortLiquidity: BigInt(101),
        },
        indexTokenAddress: "0x1",
        preferredTradeType: TradeType.Short,
      };

      const result = chooseSuitableMarket(input);

      expect(result).toEqual({
        indexTokenAddress: "0x1",
        marketTokenAddress: "0x3",
        tradeType: TradeType.Short,
      });
    });

    it("should should choose market with largest long liquidity pool if largest position is preferred", () => {
      const input: Input = {
        maxLongLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x2",
          maxLongLiquidity: BigInt(101),
          maxShortLiquidity: BigInt(99),
        },
        maxShortLiquidityPool: {
          indexTokenAddress: "0x1",
          marketTokenAddress: "0x3",
          maxLongLiquidity: BigInt(99),
          maxShortLiquidity: BigInt(101),
        },
        indexTokenAddress: "0x1",
        preferredTradeType: "largestPosition",
      };

      const result = chooseSuitableMarket(input);

      expect(result).toEqual({
        indexTokenAddress: "0x1",
        marketTokenAddress: "0x2",
        tradeType: TradeType.Long,
      });
    });
  });

  // TODO existing positions tests
});
