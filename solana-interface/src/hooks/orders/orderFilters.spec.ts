import { describe, expect, it } from "vitest";

import {
  filterSolanaOrders,
  getSolanaOrderTypeFilterValue,
  getSolanaPositionsWithOrders,
  matchesSolanaMarketFilter,
  matchesSolanaOrderType,
  SOLANA_ORDER_TYPE_FILTER_VALUES,
} from "./orderFilters";
import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const NATIVE_SOL = "11111111111111111111111111111111";
const SOL_MARKET = "SoLMarket11111111111111111111111111111111111";
// Same display name as SOL_MARKET would have, different address; base58 is case-sensitive.
const SOL_MARKET_2 = "solmarket11111111111111111111111111111111111";
const BTC_MARKET = "BtcMarket11111111111111111111111111111111111";
const ONE_USD = 10n ** 20n;

function order(overrides: Partial<RawSolanaOrder>) {
  const raw: RawSolanaOrder = {
    pubkey: overrides.pubkey ?? "order",
    slot: 1,
    owner: "owner",
    store: "store",
    marketToken: SOL_MARKET,
    actionState: 0,
    kind: K.LimitIncrease,
    isLong: true,
    initialCollateralToken: USDC,
    collateralToken: USDC,
    longToken: WSOL,
    shortToken: USDC,
    sizeDeltaUsd: 100n * ONE_USD,
    initialCollateralDeltaAmount: 0n,
    triggerPrice: 1n,
    acceptablePrice: 0n,
    minOutputAmount: 0n,
    primarySwapPath: [],
    updatedAt: 1n,
    updatedAtSlot: 1n,
    ...overrides,
  };
  return toSolanaOrderViewModel(raw, { marketInfo: undefined, tokenPriceByMint: new Map() });
}

const longLimit = order({ pubkey: "longLimit", kind: K.LimitIncrease, isLong: true });
const shortTp = order({ pubkey: "shortTp", kind: K.LimitDecrease, isLong: false, positionAddress: "posShort" });
const longSl = order({ pubkey: "longSl", kind: K.StopLossDecrease, isLong: true, marketToken: BTC_MARKET, positionAddress: "posBtc" });
const nativeLimit = order({ pubkey: "nativeLimit", kind: K.LimitIncrease, initialCollateralToken: NATIVE_SOL, collateralToken: NATIVE_SOL });
const marketIncrease = order({ pubkey: "marketIncrease", kind: K.MarketIncrease });
const deposit = order({ pubkey: "deposit", kind: K.MarketIncrease, sizeDeltaUsd: 0n });
const swap = order({
  pubkey: "swap",
  kind: K.LimitSwap,
  finalOutputToken: WSOL,
  primarySwapPath: [BTC_MARKET, "MiddleMarket11111111111111111111111111111111", SOL_MARKET],
});
const swapNoPath = order({ pubkey: "swapNoPath", kind: K.LimitSwap, finalOutputToken: WSOL, marketToken: SOL_MARKET_2 });
const all = [longLimit, shortTp, longSl, nativeLimit, marketIncrease, deposit, swap, swapNoPath];
const keys = (orders: { key: string }[]) => orders.map((o) => o.key);

describe("order type filter", () => {
  it("maps every on-chain kind explicitly: take-profit is LimitDecrease", () => {
    expect(getSolanaOrderTypeFilterValue(K.LimitIncrease)).toBe("trigger-limit");
    expect(getSolanaOrderTypeFilterValue(K.LimitDecrease)).toBe("trigger-take-profit");
    expect(getSolanaOrderTypeFilterValue(K.StopLossDecrease)).toBe("trigger-stop-loss");
    expect(getSolanaOrderTypeFilterValue(K.LimitSwap)).toBe("swaps-limit");
    for (const kind of [K.Liquidation, K.AutoDeleveraging, K.MarketSwap, K.MarketIncrease, K.MarketDecrease]) {
      expect(getSolanaOrderTypeFilterValue(kind)).toBeUndefined();
    }
    expect(SOLANA_ORDER_TYPE_FILTER_VALUES).not.toContain("twap");
    expect(SOLANA_ORDER_TYPE_FILTER_VALUES).not.toContain("swaps-twap");
  });

  it("keeps everything without a filter and unions selected types", () => {
    expect(all.every((o) => matchesSolanaOrderType(o, []))).toBe(true);
    expect(keys(filterSolanaOrders(all, [], ["trigger-take-profit"]))).toEqual(["shortTp"]);
    expect(keys(filterSolanaOrders(all, [], ["trigger-limit", "trigger-stop-loss"]))).toEqual(["longLimit", "longSl", "nativeLimit"]);
    expect(keys(filterSolanaOrders(all, [], ["swaps-limit"]))).toEqual(["swap", "swapNoPath"]);
  });

  it("hides market and deposit orders once any type is selected", () => {
    expect(keys(filterSolanaOrders(all, [], ["trigger-limit"]))).not.toContain("marketIncrease");
    expect(keys(filterSolanaOrders(all, [], ["trigger-limit"]))).not.toContain("deposit");
    expect(keys(filterSolanaOrders(all, [], []))).toEqual(keys(all));
  });
});

describe("market / direction filter", () => {
  it("filters by pure direction", () => {
    expect(keys(filterSolanaOrders(all, [{ marketAddress: "any", direction: "long" }], []))).toEqual([
      "longLimit",
      "longSl",
      "nativeLimit",
      "marketIncrease",
      "deposit",
    ]);
    expect(keys(filterSolanaOrders(all, [{ marketAddress: "any", direction: "short" }], []))).toEqual(["shortTp"]);
    expect(keys(filterSolanaOrders(all, [{ marketAddress: "any", direction: "swap" }], []))).toEqual(["swap", "swapNoPath"]);
    expect(
      keys(
        filterSolanaOrders(
          all,
          [
            { marketAddress: "any", direction: "short" },
            { marketAddress: "any", direction: "swap" },
          ],
          []
        )
      )
    ).toEqual(["shortTp", "swap", "swapNoPath"]);
  });

  it("matches markets by exact address, distinguishing same-named markets", () => {
    const solOnly = filterSolanaOrders(all, [{ marketAddress: SOL_MARKET, direction: "any" }], []);
    expect(keys(solOnly)).toEqual(["longLimit", "shortTp", "nativeLimit", "marketIncrease", "deposit", "swap"]);
    expect(keys(filterSolanaOrders(all, [{ marketAddress: SOL_MARKET_2, direction: "any" }], []))).toEqual(["swapNoPath"]);
    expect(keys(filterSolanaOrders(all, [{ marketAddress: BTC_MARKET, direction: "any" }], []))).toEqual(["longSl", "swap"]);
  });

  it("matches swap orders by the first or last market of the route only", () => {
    expect(matchesSolanaMarketFilter(swap, [{ marketAddress: BTC_MARKET, direction: "swap" }])).toBe(true);
    expect(matchesSolanaMarketFilter(swap, [{ marketAddress: SOL_MARKET, direction: "swap" }])).toBe(true);
    expect(
      matchesSolanaMarketFilter(swap, [{ marketAddress: "MiddleMarket11111111111111111111111111111111", direction: "any" }])
    ).toBe(false);
    // a directed (long / short) market filter never matches a swap
    expect(matchesSolanaMarketFilter(swap, [{ marketAddress: SOL_MARKET, direction: "long" }])).toBe(false);
    // no route: the order market is used
    expect(matchesSolanaMarketFilter(swapNoPath, [{ marketAddress: SOL_MARKET_2, direction: "swap" }])).toBe(true);
  });

  it("matches open-position items by market, direction and (wrapped) collateral", () => {
    const longUsdc = { marketAddress: SOL_MARKET, direction: "long" as const, collateralAddress: USDC };
    const longWsol = { marketAddress: SOL_MARKET, direction: "long" as const, collateralAddress: WSOL };
    expect(keys(filterSolanaOrders(all, [longUsdc], []))).toEqual(["longLimit", "marketIncrease", "deposit"]);
    // native SOL pay token settles into the wSOL position collateral
    expect(keys(filterSolanaOrders(all, [longWsol], []))).toEqual(["nativeLimit"]);
    expect(matchesSolanaMarketFilter(shortTp, [longUsdc])).toBe(false);
  });

  it("ANDs the market and type dimensions", () => {
    expect(keys(filterSolanaOrders(all, [{ marketAddress: SOL_MARKET, direction: "any" }], ["trigger-limit"]))).toEqual([
      "longLimit",
      "nativeLimit",
    ]);
    expect(filterSolanaOrders(all, [{ marketAddress: BTC_MARKET, direction: "any" }], ["trigger-take-profit"])).toEqual([]);
  });
});

describe("getSolanaPositionsWithOrders", () => {
  it("keeps the positions referenced by an order's on-chain position address", () => {
    const positions = [{ positionAddress: "posShort" }, { positionAddress: "posBtc" }, { positionAddress: "posIdle" }];
    expect(getSolanaPositionsWithOrders(positions, all).map((p) => p.positionAddress)).toEqual(["posShort", "posBtc"]);
  });
});
