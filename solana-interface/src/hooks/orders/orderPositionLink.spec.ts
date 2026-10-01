import { describe, expect, it } from "vitest";

import { isSolanaFullCloseOrder, linkSolanaOrderToPosition, SOLANA_FULL_CLOSE_DUST_USD } from "./orderPositionLink";
import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const MARKET = "MarketTokenAddress11111111111111111111111111";
const POSITION = "PositionAddress1111111111111111111111111111";
const ONE_USD = 10n ** 20n;
const GMX_USD = 10n ** 30n;

function order(overrides: Partial<RawSolanaOrder>) {
  const raw: RawSolanaOrder = {
    pubkey: "order",
    slot: 1,
    owner: "owner",
    store: "store",
    marketToken: MARKET,
    actionState: 0,
    kind: K.LimitDecrease,
    isLong: true,
    positionAddress: POSITION,
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

const positions = new Map([[POSITION, { positionAddress: POSITION, sizeInUsd: 100n * GMX_USD, collateralAmount: 42_000_000n }]]);

describe("isSolanaFullCloseOrder", () => {
  const decrease = { kind: K.LimitDecrease, sizeDeltaUsd: -100n * GMX_USD };

  it("is a full close when the size reaches the position size or leaves only dust", () => {
    expect(isSolanaFullCloseOrder(decrease, 100n * GMX_USD)).toBe(true);
    expect(isSolanaFullCloseOrder(decrease, 90n * GMX_USD)).toBe(true);
    expect(isSolanaFullCloseOrder(decrease, 100n * GMX_USD + SOLANA_FULL_CLOSE_DUST_USD - 1n)).toBe(true);
    expect(isSolanaFullCloseOrder({ ...decrease, kind: K.StopLossDecrease }, 100n * GMX_USD)).toBe(true);
    expect(isSolanaFullCloseOrder({ ...decrease, kind: K.MarketDecrease }, 100n * GMX_USD)).toBe(true);
  });

  it("is a partial close when more than dust remains", () => {
    expect(isSolanaFullCloseOrder(decrease, 100n * GMX_USD + SOLANA_FULL_CLOSE_DUST_USD)).toBe(false);
    expect(isSolanaFullCloseOrder(decrease, 200n * GMX_USD)).toBe(false);
  });

  it("never applies to increase orders or without a linked position", () => {
    expect(isSolanaFullCloseOrder({ kind: K.LimitIncrease, sizeDeltaUsd: 100n * GMX_USD }, 100n * GMX_USD)).toBe(false);
    expect(isSolanaFullCloseOrder(decrease, undefined)).toBe(false);
    expect(isSolanaFullCloseOrder(decrease, 0n)).toBe(false);
  });
});

describe("linkSolanaOrderToPosition", () => {
  it("attaches the full-close flag and the position margin by the on-chain position address", () => {
    const linked = linkSolanaOrderToPosition(order({}), positions);
    if (linked.category !== "position") throw new Error("expected position order");
    expect(linked.isFullClose).toBe(true);
    expect(linked.positionCollateralAmount).toBe(42_000_000n);

    const partial = linkSolanaOrderToPosition(order({ sizeDeltaUsd: 40n * ONE_USD }), positions);
    if (partial.category !== "position") throw new Error("expected position order");
    expect(partial.isFullClose).toBe(false);
    expect(partial.positionCollateralAmount).toBe(42_000_000n);
  });

  it("leaves orders without a known position, and swap orders, untouched", () => {
    const unknown = linkSolanaOrderToPosition(order({ positionAddress: "Other" }), positions);
    if (unknown.category !== "position") throw new Error("expected position order");
    expect(unknown.isFullClose).toBe(false);
    expect(unknown.positionCollateralAmount).toBeUndefined();

    const detached = linkSolanaOrderToPosition(order({ positionAddress: undefined }), positions);
    if (detached.category !== "position") throw new Error("expected position order");
    expect(detached.isFullClose).toBe(false);

    const swap = order({ kind: K.LimitSwap, finalOutputToken: WSOL });
    expect(linkSolanaOrderToPosition(swap, positions)).toBe(swap);
  });
});
