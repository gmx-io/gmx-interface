import { describe, expect, it } from "vitest";

import { GMSOL_LONG, GMSOL_PRECISION, GMSOL_SHORT, GMSOL_SIDES } from "utils/gmsol/constants";
import { getGmsolOrderFeeDiscountFactor } from "utils/gmsol/fees";
import {
  getGmsolBorrowingFactorPerSecond,
  getGmsolMarketStatus,
  getGmsolNextFunding,
  getGmsolPendingPnl,
  getGmsolPoolValue,
  getGmsolPoolValueWithoutPnl,
  getGmsolReservedValue,
} from "utils/gmsol/markets";
import { gmsolMath } from "utils/gmsol/numbers";
import { getGmsolPendingPositionFees } from "utils/gmsol/positions";
import type {
  GmsolFeeDiscountConfig,
  GmsolMarketPrices,
  GmsolMarketState,
  GmsolPendingPositionFees,
  GmsolPnlFactorKind,
  GmsolPositionState,
} from "utils/gmsol/types";

// mainnet market and position states decoded from the API fixtures in provenance, with their recorded native results
import fixture from "./fixtures/nativeMath.json";

const UNIT = GMSOL_PRECISION;

const IDENTIFIER_KEYS = [
  "name",
  "marketTokenMint",
  "longTokenMint",
  "shortTokenMint",
  "store",
  "owner",
  "marketToken",
  "collateralToken",
];

// get_market_token_price per entry, in the order of each market view's pricesExpected
const PRICE_VIEWS: [GmsolPnlFactorKind, boolean][] = [
  ["maxForTrader", true],
  ["maxForTrader", false],
  ["maxAfterDeposit", true],
  ["maxAfterWithdrawal", false],
];

// the program prices one whole GM token, which has 9 decimals, and returns $1 while the supply is 0
const GM_TOKEN_UNIT = 10n ** 9n;

const positionMarkets = new Map(fixture.positions.markets.map((entry) => [entry.name, entry] as const));

function parseBigints<T>(value: unknown, key = ""): T {
  if (Array.isArray(value)) {
    return value.map((item) => parseBigints(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, parseBigints(item, field)])) as T;
  }
  return (typeof value === "string" && !IDENTIFIER_KEYS.includes(key) ? BigInt(value) : value) as T;
}

function getGmPrice(value: bigint, supply: bigint): bigint {
  return supply === 0n ? UNIT : gmsolMath.mulDiv(value, GM_TOKEN_UNIT, supply, "gm price");
}

describe("gmsol market math matches the store program", () => {
  it("matches native borrowing and funding with fractional exponents FESOL-109", () => {
    const base = parseBigints<GmsolMarketState>(fixture.marketViews[0].market);
    const prices: GmsolMarketPrices = {
      index: { min: UNIT / 10n ** 9n, max: UNIT / 10n ** 9n },
      long: { min: UNIT / 10n ** 6n, max: UNIT / 10n ** 6n },
      short: { min: UNIT / 10n ** 6n, max: UNIT / 10n ** 6n },
    };
    for (const [exponent, borrowing, funding] of [
      [UNIT / 2n, 2_828_427_123_200n, 33_333_333_316_666n],
      [(UNIT * 3n) / 2n, 565_685_410_479_800n, 3_333_333_328_793_333n],
      [(UNIT * 7n) / 4n, 2_127_317_204_904_000n, 10_540_925_175_750_000n],
      [UNIT, 40_000_000_000_000n, 333_333_333_333_333n],
      [UNIT * 2n, 8_000_000_000_000_000n, 33_333_333_333_333_333n],
    ] as const) {
      const market: GmsolMarketState = {
        ...base,
        primary: [500_000_000_000n, 500_000_000_000n],
        openInterest: [100n * UNIT, 200n * UNIT],
        openInterestInTokens: [100_000_000_000n, 200_000_000_000n],
        skipBorrowingFeeForSmallerSide: true,
        borrowingFeeOptimalUsageFactor: [0n, 0n],
        borrowingFeeExponent: [exponent, exponent],
        borrowingFeeFactor: [UNIT / 1000n, UNIT / 1000n],
        funding: {
          ...base.funding,
          exponent,
          factor: UNIT / 100_000n,
          increaseFactorPerSecond: 0n,
          maxFactorPerSecond: UNIT,
        },
      };
      expect(getGmsolBorrowingFactorPerSecond({ market, prices, side: GMSOL_LONG })).toBe(0n);
      expect(getGmsolBorrowingFactorPerSecond({ market, prices, side: GMSOL_SHORT })).toBe(borrowing);
      expect(getGmsolNextFunding(market, 0)).toEqual({ factor: funding, longsPayShorts: false });
    }
  });

  it.each(fixture.marketViews)("$name", (view) => {
    const market = parseBigints<GmsolMarketState>(view.market);
    const prices = parseBigints<GmsolMarketPrices>(view.prices);

    // get_market_status with both maximize flags true, then both false
    for (const { maximize, borrowing, pnl, reserved, poolWithoutPnl } of view.status) {
      for (const side of GMSOL_SIDES) {
        expect(getGmsolBorrowingFactorPerSecond({ market, prices, side })).toBe(BigInt(borrowing[side]));
        expect(getGmsolPendingPnl({ market, indexPrice: prices.index, side, maximize })).toBe(BigInt(pnl[side]));
        expect(getGmsolReservedValue({ market, prices, side })).toBe(BigInt(reserved[side]));
        expect(getGmsolPoolValueWithoutPnl({ market, prices, side, maximize })).toBe(BigInt(poolWithoutPnl[side]));
      }
    }
    PRICE_VIEWS.forEach(([pnlFactorKind, maximize], i) => {
      const poolValue = getGmsolPoolValue({ market, prices, now: view.now, pnlFactorKind, maximize });
      expect(getGmPrice(poolValue, BigInt(view.supply))).toBe(BigInt(view.pricesExpected[i]));
    });

    // the view returns the stored funding factor, so the next one is checked against the SDK
    const long = BigInt(view.sdkNextFunding.long);
    const short = BigInt(view.sdkNextFunding.short);
    const funding = getGmsolNextFunding(market, view.now);
    expect(funding.factor).toBe(long > 0n ? long : short > 0n ? short : 0n);
    if (funding.factor > 0n) {
      expect(funding.longsPayShorts).toBe(long > 0n);
    }
  });
});

describe("getGmsolMarketStatus matches the gmsol SDK", () => {
  it.each([
    ["SOL/USD[USDC-USDC]", "longs pay"],
    ["WTI/USD[USDC-USDC]", "shorts pay, the factor at its max"],
    ["LINK/USD[WSOL-USDC]", "shorts pay, liquidity capped by max open interest"],
    ["ETH/USD[WETH-WETH]", "a skew under $1 counts as none, so the min factor applies"],
    ["ASTER/USD[USDT-USDT]", "no open interest, so no funding"],
    ["NATGAS/USD[USDC-USDC]", "reserved value above the max reserve leaves no long liquidity"],
    ["AAPL/USD[USDC-USDC]", "closed stock session"],
  ])("%s: %s", (name) => {
    const { market, prices, expected } = fixture.marketStatus.markets.find((entry) => entry.name === name)!;
    const status = getGmsolMarketStatus({
      market: parseBigints<GmsolMarketState>(market),
      prices: parseBigints<GmsolMarketPrices>(prices),
      now: fixture.marketStatus.now,
    });

    // the SDK gives each side's rate, positive for the side that pays
    const long = BigInt(expected.fundingRatePerSecondForLong);
    const short = BigInt(expected.fundingRatePerSecondForShort);
    expect(status.fundingFactorPerSecond).toBe(long > 0n ? long : short > 0n ? short : 0n);
    if (status.fundingFactorPerSecond > 0n) {
      expect(status.longsPayShorts).toBe(long > 0n);
    }
    expect(status.liquidityForLong).toBe(BigInt(expected.liquidityForLong));
    expect(status.liquidityForShort).toBe(BigInt(expected.liquidityForShort));
  });
});

describe("getGmsolPendingPositionFees matches gmsol", () => {
  it.each(fixture.positions.positions)("$picked", ({ market, position, expected }) => {
    const { market: state, prices } = positionMarkets.get(market)!;
    const fees = getGmsolPendingPositionFees({
      market: parseBigints<GmsolMarketState>(state),
      prices: parseBigints<GmsolMarketPrices>(prices),
      now: fixture.positions.now,
      position: parseBigints<GmsolPositionState>(position),
    });
    expect(fees).toEqual(parseBigints<GmsolPendingPositionFees>(expected));
  });
});

function getBasisPointFactor(value: bigint): bigint {
  return (GMSOL_PRECISION / 10_000n) * value;
}

function createDiscountConfig(byRank: Record<number, bigint>, referredUser = 0n): GmsolFeeDiscountConfig {
  return { maxRank: 9, byRank: Array.from({ length: 16 }, (_, rank) => byRank[rank] ?? 0n), referredUser };
}

describe("gmsol order fee discount", () => {
  // the cases of gmsol's own tests in crates/programs/src/utils/store.rs at 8af1e70c
  it.each([
    { name: "rank 0", store: createDiscountConfig({}), rank: 0, referred: false, factor: 0n },
    {
      name: "rank 1",
      store: createDiscountConfig({ 1: getBasisPointFactor(250n) }),
      rank: 1,
      referred: false,
      factor: getBasisPointFactor(250n),
    },
    {
      name: "referred at rank 0",
      store: createDiscountConfig({}, getBasisPointFactor(1000n)),
      rank: 0,
      referred: true,
      factor: getBasisPointFactor(1000n),
    },
    {
      name: "referred at rank 1",
      store: createDiscountConfig({ 1: getBasisPointFactor(250n) }, getBasisPointFactor(1000n)),
      rank: 1,
      referred: true,
      factor: getBasisPointFactor(1225n),
    },
    {
      name: "max rank",
      store: createDiscountConfig({ 9: getBasisPointFactor(2250n) }),
      rank: 9,
      referred: false,
      factor: getBasisPointFactor(2250n),
    },
    {
      name: "referred at rank 5",
      store: createDiscountConfig({ 5: getBasisPointFactor(1250n) }, getBasisPointFactor(1000n)),
      rank: 5,
      referred: true,
      factor: getBasisPointFactor(2125n),
    },
    {
      name: "high discounts",
      store: createDiscountConfig({ 0: getBasisPointFactor(5000n) }, getBasisPointFactor(4000n)),
      rank: 0,
      referred: true,
      factor: getBasisPointFactor(7000n),
    },
  ])("$name", ({ store, rank, referred, factor }) => {
    expect(getGmsolOrderFeeDiscountFactor({ config: store, rank, isReferred: referred })).toBe(factor);
  });

  it("rejects a rank above the max rank", () => {
    expect(() =>
      getGmsolOrderFeeDiscountFactor({ config: createDiscountConfig({}), rank: 10, isReferred: false })
    ).toThrow("exceeds the max rank");
  });

  it("matches the native Store discounts", () => {
    const config = parseBigints<GmsolFeeDiscountConfig>(fixture.feeDiscount.config);
    for (const { rank, referred, factor } of fixture.feeDiscount.expected) {
      expect(getGmsolOrderFeeDiscountFactor({ config, rank, isReferred: referred })).toBe(BigInt(factor));
    }
  });
});
