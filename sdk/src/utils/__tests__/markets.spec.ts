import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { TOKENS } from "configs/tokens";
import {
  getMarketFullName,
  getMarketIndexName,
  getMarketPoolName,
  getContractMarketPrices,
  getTokenPoolType,
  getPoolUsdWithoutPnl,
  getCappedPoolPnl,
  getMaxLeverageByMinCollateralFactor,
  getMaxAllowedLeverage,
  getOppositeCollateral,
  getAvailableUsdLiquidityForCollateral,
  getReservedUsd,
  getMarketDivisor,
  getMarketPnl,
  getOpenInterestUsd,
  getOpenInterestInTokens,
  getPriceForPnl,
} from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { BASIS_POINTS_DIVISOR, expandDecimals } from "utils/numbers";
import { Token, TokensData } from "utils/tokens/types";

function getToken(symbol: string) {
  return TOKENS[ARBITRUM].find((token) => token.symbol === symbol) as Token;
}

describe("getMarketFullName", () => {
  it("returns proper full name", () => {
    const longToken = getToken("ETH");
    const shortToken = getToken("USDC");
    const indexToken = getToken("BTC");

    const name = getMarketFullName({
      longToken,
      shortToken,
      indexToken,
      isSpotOnly: false,
    });
    expect(name).toBe("BTC/USD [ETH-USDC]");
  });

  it("returns swap-only name", () => {
    const indexToken = { symbol: "ETH", address: "0xeth", decimals: 18 } as Token;
    const name = getMarketFullName({
      longToken: indexToken,
      shortToken: indexToken,
      indexToken,
      isSpotOnly: true,
    });
    expect(name).toBe("SWAP-ONLY [ETH-ETH]");
  });
});

describe("getMarketIndexName", () => {
  it("returns 'SWAP-ONLY' if isSpotOnly is true", () => {
    expect(
      getMarketIndexName({
        indexToken: getToken("ETH"),
        isSpotOnly: true,
      })
    ).toBe("SWAP-ONLY");
  });

  it("returns prefix + baseSymbol/symbol + /USD", () => {
    const eth = getToken("ETH");
    expect(getMarketIndexName({ indexToken: eth, isSpotOnly: false })).toBe("ETH/USD");

    const pepe = getToken("PEPE");
    expect(getMarketIndexName({ indexToken: pepe, isSpotOnly: false })).toBe("kPEPE/USD");
  });
});

describe("getMarketPoolName", () => {
  it("returns single token symbol if long and short are the same", () => {
    const token = getToken("ETH");
    expect(getMarketPoolName({ longToken: token, shortToken: token })).toBe("ETH-ETH");
  });

  it("returns combined symbol otherwise", () => {
    const longToken = getToken("ETH");
    const shortToken = getToken("USDC");
    expect(getMarketPoolName({ longToken, shortToken })).toBe("ETH-USDC");
  });
});

describe("getContractMarketPrices", () => {
  it("returns undefined if any token is missing", () => {
    const market = {
      indexTokenAddress: "0xbtc",
      longTokenAddress: "0xeth",
      shortTokenAddress: "0xusdc",
    };
    expect(getContractMarketPrices({}, market as any)).toBeUndefined();
  });

  it("returns converted contract prices if all tokens exist", () => {
    const tokensData = {
      "0xbtc": { decimals: 8, prices: { minPrice: 1000n, maxPrice: 2000n } },
      "0xeth": { decimals: 18, prices: { minPrice: 3000n, maxPrice: 4000n } },
      "0xusdc": { decimals: 6, prices: { minPrice: 1n, maxPrice: 2n } },
    } as unknown as TokensData;
    const market = {
      indexTokenAddress: "0xbtc",
      longTokenAddress: "0xeth",
      shortTokenAddress: "0xusdc",
    };
    const result = getContractMarketPrices(tokensData, market as any);
    expect(result).toBeDefined();
    expect(result?.indexTokenPrice?.min).toBeDefined();
  });
});

describe("getTokenPoolType", () => {
  it("returns 'long' for single-token markets if matches address", () => {
    const token = getToken("ETH");
    expect(getTokenPoolType({ longToken: token, shortToken: token }, token.address)).toBe("long");
  });

  it("returns 'short' for shortToken match", () => {
    const longToken = getToken("ETH");
    const shortToken = getToken("USDC");
    expect(getTokenPoolType({ longToken, shortToken }, shortToken.address)).toBe("short");
  });
});

describe("getPoolUsdWithoutPnl", () => {
  const marketInfo = {
    longPoolAmount: 1n,
    shortPoolAmount: 1n,
    longToken: { decimals: 18, prices: { minPrice: expandDecimals(5, 30), maxPrice: expandDecimals(15, 30) } },
    shortToken: { decimals: 18, prices: { minPrice: expandDecimals(2, 30), maxPrice: expandDecimals(4, 30) } },
  } as MarketInfo;

  it("calculates poolUsd for isLong = true", () => {
    expect(getPoolUsdWithoutPnl(marketInfo, true, "minPrice")).toBe(5000000000000n);
    expect(getPoolUsdWithoutPnl(marketInfo, true, "maxPrice")).toBe(15000000000000n);
  });

  it("calculates poolUsd for isLong = false", () => {
    expect(getPoolUsdWithoutPnl(marketInfo, false, "minPrice")).toBe(2000000000000n);
    expect(getPoolUsdWithoutPnl(marketInfo, false, "maxPrice")).toBe(4000000000000n);
  });
});

describe("getCappedPoolPnl", () => {
  it("returns capped pnl if poolPnl > maxPnl", () => {
    const marketInfo = {
      maxPnlFactorForTradersLong: 20000n,
      maxPnlFactorForTradersShort: 10000n,
    } as MarketInfo;
    const result = getCappedPoolPnl({
      marketInfo,
      poolUsd: expandDecimals(1000, 30),
      poolPnl: 30000n,
      isLong: true,
    });
    expect(result).toBe(30000n);
  });

  it("returns poolPnl if below maxPnl", () => {
    const marketInfo = { maxPnlFactorForTradersLong: 20000n } as MarketInfo;
    expect(
      getCappedPoolPnl({
        marketInfo,
        poolUsd: expandDecimals(1000, 30),
        poolPnl: 5000n,
        isLong: true,
      })
    ).toBe(5000n);
  });
});

describe("getMaxLeverageByMinCollateralFactor", () => {
  it("returns default if minCollateralFactor is undefined", () => {
    expect(getMaxLeverageByMinCollateralFactor(undefined)).toBe(1000000);
  });

  it("returns correct leverage for a given factor", () => {
    expect(getMaxLeverageByMinCollateralFactor(1000000000000000000n)).toBe(10000000000000000);
  });
});

describe("getMaxAllowedLeverage", () => {
  // Factors are expressed in PRECISION units (1e30 == 100%).
  const pct = (percent: number) => expandDecimals(percent * 100, 26); // 0.5% → 5e27
  const bps = (lev: number) => lev * BASIS_POINTS_DIVISOR;

  it("returns default 100x when any factor is undefined or zero", () => {
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: undefined,
        minCollateralFactorForLiquidation: undefined,
        positionFeeFactorForBalanceWasNotImproved: undefined,
      })
    ).toBe(bps(100));

    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: 0n,
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(100));

    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(0.5),
        minCollateralFactorForLiquidation: 0n,
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(100));

    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(0.5),
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: undefined,
      })
    ).toBe(bps(100));
  });

  it("returns 100x for BTC/ETH (equal MCF and liqMCF, liquidation bound dominates)", () => {
    // MCF = liqMCF = 0.5%, fee = 0.05%
    // opening = 1 / (0.005 + 0.001) ≈ 166.67x
    // liquidation = 1 / (2 × 0.005) = 100x
    // min floored to 5x = 100x
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(0.5),
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(100));
  });

  it("returns 85x for ZEC (opening bound dominates, floors to 5x)", () => {
    // MCF = 1%, liqMCF = 0.5%, fee = 0.06%
    // opening = 1 / (0.01 + 0.0012) ≈ 89.29x
    // liquidation = 1 / (2 × 0.005) = 100x
    // min floored to 5x = 85x
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(1),
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: pct(0.06),
      })
    ).toBe(bps(85));
  });

  it("returns 100x for GOLD on-hours (split factors)", () => {
    // MCF = 0.9%, liqMCF = 0.5%, fee = 0.05%
    // opening = 1 / (0.009 + 0.001) = 100x
    // liquidation = 1 / (2 × 0.005) = 100x
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: 9n * 10n ** 27n,
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(100));
  });

  it("returns 25x for GOLD off-hours (split factors, opening bound dominates)", () => {
    // MCF = 3.5%, liqMCF = 1%, fee = 0.05%
    // opening = 1 / (0.035 + 0.001) ≈ 27.78x
    // liquidation = 1 / (2 × 0.01) = 50x
    // min floored to 5x = 25x
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: 35n * 10n ** 27n,
        minCollateralFactorForLiquidation: pct(1),
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(25));
  });

  it("floors to the nearest 5x", () => {
    // Choose factors so opening = 47.17x exactly, should floor to 45x
    // 1 / (MCF + 2×fee) = 47.17 → MCF + 2×fee ≈ 0.0212
    // MCF = 2%, fee = 0.06% → 0.02 + 0.0012 = 0.0212 → 1/0.0212 ≈ 47.17
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(2),
        minCollateralFactorForLiquidation: pct(0.5),
        positionFeeFactorForBalanceWasNotImproved: pct(0.06),
      })
    ).toBe(bps(45));
  });

  it("liquidation bound dominates when MCF-for-liquidation is relatively high", () => {
    // MCF = 0.5%, liqMCF = 2%, fee = 0.05%
    // opening = 1 / (0.005 + 0.001) ≈ 166.67x
    // liquidation = 1 / (2 × 0.02) = 25x → min 25x
    expect(
      getMaxAllowedLeverage({
        minCollateralFactor: pct(0.5),
        minCollateralFactorForLiquidation: pct(2),
        positionFeeFactorForBalanceWasNotImproved: pct(0.05),
      })
    ).toBe(bps(25));
  });
});

describe("getOppositeCollateral", () => {
  const marketInfo = {
    longToken: getToken("ETH"),
    shortToken: getToken("USDC"),
  } as MarketInfo;
  it("returns shortToken if token is long", () => {
    expect(getOppositeCollateral(marketInfo, marketInfo.longToken.address)).toEqual(marketInfo.shortToken);
  });

  it("returns undefined if pool type is not found", () => {
    expect(getOppositeCollateral(marketInfo, "0xbtc")).toBeUndefined();
  });
});

describe("getAvailableUsdLiquidityForCollateral", () => {
  it("returns poolUsd if isSpotOnly", () => {
    const marketInfo = {
      isSpotOnly: true,
      longPoolAmount: 1n,
      indexToken: {
        ...getToken("ETH"),
        prices: { minPrice: expandDecimals(10, 18), maxPrice: expandDecimals(15, 18) },
      },
      longToken: { decimals: 18, prices: { minPrice: expandDecimals(1, 18), maxPrice: expandDecimals(2, 18) } },
    } as MarketInfo;
    expect(getAvailableUsdLiquidityForCollateral(marketInfo, true)).toBe(1n);
  });

  it("calculates liquidity if not spot only", () => {
    const marketInfo = {
      isSpotOnly: false,
      reserveFactorLong: 1n,
      longPoolAmount: expandDecimals(5, 30),
      longInterestInTokens: 1n,
      indexToken: {
        ...getToken("ETH"),
        prices: { minPrice: expandDecimals(10, 18), maxPrice: expandDecimals(15, 18) },
      },
      longToken: { decimals: 18, prices: { minPrice: expandDecimals(10, 18), maxPrice: expandDecimals(15, 18) } },
    } as MarketInfo;
    expect(getAvailableUsdLiquidityForCollateral(marketInfo, true)).toBe(expandDecimals(35, 30));
  });
});

describe("getReservedUsd", () => {
  it("calculates reservedUsd for long side", () => {
    const marketInfo = {
      longInterestInTokens: 100n,
      indexToken: {
        decimals: 18,
        prices: { maxPrice: expandDecimals(10, 18) },
      },
    } as MarketInfo;
    expect(getReservedUsd(marketInfo, true)).toBe(1000n);
  });

  it("returns shortInterestUsd if isLong=false", () => {
    const marketInfo = { shortInterestUsd: 9999n } as MarketInfo;
    expect(getReservedUsd(marketInfo, false)).toBe(9999n);
  });
});

describe("getMarketDivisor", () => {
  it("returns 2n if longTokenAddress equals shortTokenAddress", () => {
    expect(
      getMarketDivisor({
        longTokenAddress: "0xsame",
        shortTokenAddress: "0xsame",
      })
    ).toBe(2n);
  });

  it("returns 1n otherwise", () => {
    expect(
      getMarketDivisor({
        longTokenAddress: "0xeth",
        shortTokenAddress: "0xusdc",
      })
    ).toBe(1n);
  });
});

describe("getMarketPnl", () => {
  it("returns 0n if openInterest is 0", () => {
    const marketInfo = {
      indexToken: {
        decimals: 18,
        prices: { minPrice: expandDecimals(1000, 18), maxPrice: expandDecimals(2000, 18) },
      },
      longInterestUsd: 0n,
      longInterestInTokens: 0n,
    } as MarketInfo;
    expect(getMarketPnl(marketInfo, true, false)).toBe(0n);
  });

  it("calculates pnl for long positions", () => {
    const marketInfo = {
      indexToken: {
        decimals: 18,
        prices: { minPrice: expandDecimals(1000, 18), maxPrice: expandDecimals(2000, 18) },
      },
      longInterestUsd: 1000n,
      longInterestInTokens: 1n,
    } as MarketInfo;
    // maximize = false => use minPrice for long
    expect(getMarketPnl(marketInfo, true, true)).toBe(0n); // openInterestValue(1000n) - openInterestUsd(1000n) = 0
  });
});

describe("getOpenInterestUsd", () => {
  it("returns longInterestUsd for isLong", () => {
    expect(getOpenInterestUsd({ longInterestUsd: 1234n, shortInterestUsd: 9999n } as MarketInfo, true)).toBe(1234n);
  });

  it("returns shortInterestUsd for !isLong", () => {
    expect(getOpenInterestUsd({ longInterestUsd: 1234n, shortInterestUsd: 9999n } as MarketInfo, false)).toBe(9999n);
  });
});

describe("getOpenInterestInTokens", () => {
  it("returns longInterestInTokens for isLong", () => {
    expect(
      getOpenInterestInTokens({ longInterestInTokens: 100n, shortInterestInTokens: 200n } as MarketInfo, true)
    ).toBe(100n);
  });

  it("returns shortInterestInTokens for !isLong", () => {
    expect(
      getOpenInterestInTokens({ longInterestInTokens: 100n, shortInterestInTokens: 200n } as MarketInfo, false)
    ).toBe(200n);
  });
});

describe("getPriceForPnl", () => {
  it("uses maxPrice for long when maximize=true", () => {
    expect(getPriceForPnl({ minPrice: 1000n, maxPrice: 2000n }, true, true)).toBe(2000n);
  });

  it("uses maxPrice for short when maximize=false", () => {
    expect(getPriceForPnl({ minPrice: 1000n, maxPrice: 2000n }, false, false)).toBe(2000n);
  });
});
