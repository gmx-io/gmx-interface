import { describe, expect, it } from "vitest";

import { getSolanaOrderErrors, isSolanaOrderForPosition, type SolanaOrderErrorPosition } from "./orderErrors";
import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const NATIVE_SOL = "11111111111111111111111111111111";
const SOL_INDEX = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const MARKET = "MarketTokenAddress11111111111111111111111111";
const ONE_USD = 10n ** 20n;
const marketInfo = { marketToken: MARKET, indexToken: SOL_INDEX, longToken: WSOL, shortToken: USDC, supply: "1" };

function order(overrides: Partial<RawSolanaOrder>) {
  const raw: RawSolanaOrder = {
    pubkey: "order",
    slot: 1,
    owner: "owner",
    store: "store",
    marketToken: MARKET,
    actionState: 0,
    kind: K.StopLossDecrease,
    isLong: true,
    initialCollateralToken: USDC,
    collateralToken: USDC,
    longToken: WSOL,
    shortToken: USDC,
    sizeDeltaUsd: 100n * ONE_USD,
    initialCollateralDeltaAmount: 0n,
    // 140 USD per SOL as a unit price
    triggerPrice: (140n * ONE_USD) / 10n ** 9n,
    acceptablePrice: 0n,
    minOutputAmount: 0n,
    primarySwapPath: [],
    updatedAt: 1n,
    updatedAtSlot: 1n,
    ...overrides,
  };
  return toSolanaOrderViewModel(raw, { marketInfo, tokenPriceByMint: new Map() });
}

function position(overrides: Partial<SolanaOrderErrorPosition> = {}): SolanaOrderErrorPosition {
  return {
    marketTokenAddress: MARKET,
    collateralTokenAddress: USDC,
    collateralSymbol: "USDC",
    isLong: true,
    liquidationPrice: 120n * 10n ** 30n,
    ...overrides,
  };
}

describe("isSolanaOrderForPosition", () => {
  it("matches market, side and collateral for trigger orders", () => {
    const sl = order({});
    if (sl.category !== "position") throw new Error("expected position order");
    expect(isSolanaOrderForPosition(sl, position())).toBe(true);
    expect(isSolanaOrderForPosition(sl, position({ isLong: false }))).toBe(false);
    expect(isSolanaOrderForPosition(sl, position({ collateralTokenAddress: WSOL }))).toBe(false);
  });

  it("maps native SOL collateral of limit increase orders to the wrapped mint", () => {
    const limit = order({ kind: K.LimitIncrease, collateralToken: NATIVE_SOL });
    if (limit.category !== "position") throw new Error("expected position order");
    expect(isSolanaOrderForPosition(limit, position({ collateralTokenAddress: WSOL }))).toBe(true);
  });

  it("ignores collateral for market orders", () => {
    const market = order({ kind: K.MarketDecrease, collateralToken: WSOL });
    if (market.category !== "position") throw new Error("expected position order");
    expect(isSolanaOrderForPosition(market, position())).toBe(true);
  });
});

describe("getSolanaOrderErrors", () => {
  it("returns nothing for swap orders or when there is no related position", () => {
    expect(getSolanaOrderErrors(order({ kind: K.LimitSwap, finalOutputToken: WSOL }), [position()])).toEqual([]);
    expect(getSolanaOrderErrors(order({}), [])).toEqual([]);
  });

  it("flags a long stop-loss whose trigger is below the liquidation price", () => {
    const errors = getSolanaOrderErrors(order({}), [position({ liquidationPrice: 145n * 10n ** 30n })]);
    expect(errors.map((e) => e.key)).toEqual(["triggerPrice"]);
    expect(errors[0].level).toBe("error");
  });

  it("flags a short take-profit whose trigger is above the liquidation price", () => {
    const tp = order({ kind: K.LimitDecrease, isLong: false });
    expect(getSolanaOrderErrors(tp, [position({ isLong: false, liquidationPrice: 130n * 10n ** 30n })]).map((e) => e.key)).toEqual([
      "triggerPrice",
    ]);
    expect(getSolanaOrderErrors(tp, [position({ isLong: false, liquidationPrice: 150n * 10n ** 30n })])).toEqual([]);
  });

  it("does not flag a valid trigger, an unknown liquidation price or an increase order", () => {
    expect(getSolanaOrderErrors(order({}), [position({ liquidationPrice: 120n * 10n ** 30n })])).toEqual([]);
    expect(getSolanaOrderErrors(order({}), [position({ liquidationPrice: undefined })])).toEqual([]);
    expect(getSolanaOrderErrors(order({ kind: K.LimitIncrease }), [position({ liquidationPrice: 145n * 10n ** 30n })])).toEqual([]);
  });

  it("warns when the order collateral differs from the existing same-side position", () => {
    const errors = getSolanaOrderErrors(order({ collateralToken: WSOL }), [position()]);
    expect(errors.map((e) => e.key)).toEqual(["collateralToken"]);
    expect(errors[0].level).toBe("warning");
    expect(errors[0].message.message).toContain("existing long position");
    expect(errors[0].message.values).toMatchObject({ collateralSymbol: "SOL", symbol: "USDC" });
  });

  it("does not warn for a position on the other side", () => {
    expect(getSolanaOrderErrors(order({ collateralToken: WSOL }), [position({ isLong: false })])).toEqual([]);
  });
});
