import { describe, expect, it } from "vitest";

import { chooseSuitableMarket } from "domain/synthetics/markets/chooseSuitableMarket";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "sdk/utils/trade/types";

type Input = Parameters<typeof chooseSuitableMarket>[0];

const INDEX_TOKEN_ADDRESS = "0x1";
const MAX_LONG_LIQUIDITY_MARKET = "0x2";
const MAX_SHORT_LIQUIDITY_MARKET = "0x3";
const THIRD_MARKET = "0x4";
const COLLATERAL_TOKEN_ADDRESS = "0xc";

const MAX_LONG_LIQUIDITY_POOL = {
  indexTokenAddress: INDEX_TOKEN_ADDRESS,
  marketTokenAddress: MAX_LONG_LIQUIDITY_MARKET,
  maxLongLiquidity: BigInt(101),
  maxShortLiquidity: BigInt(99),
};

const MAX_SHORT_LIQUIDITY_POOL = {
  indexTokenAddress: INDEX_TOKEN_ADDRESS,
  marketTokenAddress: MAX_SHORT_LIQUIDITY_MARKET,
  maxLongLiquidity: BigInt(99),
  maxShortLiquidity: BigInt(101),
};

const THIRD_POOL = {
  indexTokenAddress: INDEX_TOKEN_ADDRESS,
  marketTokenAddress: THIRD_MARKET,
  maxLongLiquidity: BigInt(1),
  maxShortLiquidity: BigInt(1),
};

const AVAILABLE_INDEX_TOKEN_POOLS = [MAX_LONG_LIQUIDITY_POOL, MAX_SHORT_LIQUIDITY_POOL, THIRD_POOL];

function createPositionsInfo({ marketAddress, isLong }: { marketAddress: string; isLong: boolean }): PositionsInfoData {
  const position = {
    isLong,
    indexToken: { address: INDEX_TOKEN_ADDRESS, isWrapped: false },
    sizeInUsd: BigInt(1000),
    marketAddress,
    collateralTokenAddress: COLLATERAL_TOKEN_ADDRESS,
  } as unknown as PositionInfo;

  return { [`${marketAddress}-${isLong ? "long" : "short"}`]: position };
}

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

  describe("pool selection priorities", () => {
    const baseInput: Input = {
      indexTokenAddress: INDEX_TOKEN_ADDRESS,
      maxLongLiquidityPool: MAX_LONG_LIQUIDITY_POOL,
      maxShortLiquidityPool: MAX_SHORT_LIQUIDITY_POOL,
      availableIndexTokenPools: AVAILABLE_INDEX_TOKEN_POOLS,
      preferredTradeType: TradeType.Long,
    };

    describe("1. existing position or order wins", () => {
      it("should choose the pool with an existing position over the remembered selection", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Long,
          positionsInfo: createPositionsInfo({ marketAddress: MAX_SHORT_LIQUIDITY_MARKET, isLong: true }),
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_SHORT_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: COLLATERAL_TOKEN_ADDRESS,
        });
      });

      it("should choose the pool with an existing position over the remembered selection for largestPosition", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: "largestPosition",
          currentTradeType: TradeType.Long,
          positionsInfo: createPositionsInfo({ marketAddress: MAX_SHORT_LIQUIDITY_MARKET, isLong: true }),
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_SHORT_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: COLLATERAL_TOKEN_ADDRESS,
        });
      });
    });

    describe("2. remembered explicit selection wins over liquidity", () => {
      it("should choose the remembered long pool when there is no position", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Long,
          positionsInfo: {},
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: THIRD_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: undefined,
        });
      });

      it("should choose the remembered short pool when there is no position", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Short,
          positionsInfo: {},
          userSelectedMarkets: { short: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: THIRD_MARKET,
          tradeType: TradeType.Short,
          collateralTokenAddress: undefined,
        });
      });

      it("should choose the remembered pool for largestPosition strategy when there are no positions", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: "largestPosition",
          currentTradeType: TradeType.Long,
          positionsInfo: {},
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: THIRD_MARKET,
          tradeType: TradeType.Long,
        });
      });

      it("should choose the remembered pool for largestPosition when positions are not loaded", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: "largestPosition",
          currentTradeType: TradeType.Short,
          userSelectedMarkets: { short: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: THIRD_MARKET,
          tradeType: TradeType.Short,
        });
      });

      it("should not apply the remembered pool of the opposite direction", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Short,
          positionsInfo: {},
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_SHORT_LIQUIDITY_MARKET,
          tradeType: TradeType.Short,
          collateralTokenAddress: undefined,
        });
      });

      it("should keep swap selection untouched", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          isSwap: true,
          preferredTradeType: TradeType.Long,
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          tradeType: TradeType.Swap,
        });
      });
    });

    describe("3. highest liquidity is the fallback", () => {
      it("should fall back to the highest liquidity pool when nothing was ever selected", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Long,
          positionsInfo: {},
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_LONG_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: undefined,
        });
      });

      it("should fall back to the highest liquidity pool when the remembered pool is no longer available", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: TradeType.Long,
          positionsInfo: {},
          userSelectedMarkets: { long: "0xdelisted" },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_LONG_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: undefined,
        });
      });

      it("should fall back to the highest liquidity pool when available pools are unknown", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          availableIndexTokenPools: undefined,
          preferredTradeType: TradeType.Long,
          positionsInfo: {},
          userSelectedMarkets: { long: THIRD_MARKET },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_LONG_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
          collateralTokenAddress: undefined,
        });
      });

      it("should fall back to the highest liquidity pool for largestPosition when the remembered pool is gone", () => {
        const result = chooseSuitableMarket({
          ...baseInput,
          preferredTradeType: "largestPosition",
          currentTradeType: TradeType.Long,
          positionsInfo: {},
          userSelectedMarkets: { long: "0xdelisted" },
        });

        expect(result).toEqual({
          indexTokenAddress: INDEX_TOKEN_ADDRESS,
          marketTokenAddress: MAX_LONG_LIQUIDITY_MARKET,
          tradeType: TradeType.Long,
        });
      });
    });
  });
});
