import { describe, expect, it } from "vitest";

import {
  getSolanaAcceptableComparator,
  getSolanaOrderCategory,
  getSolanaOrderTypeLabel,
  getSolanaTriggerThreshold,
  isOrdersListShowKind,
  sortSolanaOrdersForList,
} from "./orderRules";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";

describe("isOrdersListShowKind", () => {
  it("shows limit / trigger / swap-limit and user market orders (GMW_425 enabled)", () => {
    expect([K.LimitSwap, K.LimitIncrease, K.LimitDecrease, K.StopLossDecrease, K.MarketIncrease, K.MarketDecrease].every(isOrdersListShowKind)).toBe(true);
  });

  it("hides liquidation, ADL and market swap", () => {
    expect([K.Liquidation, K.AutoDeleveraging, K.MarketSwap].some(isOrdersListShowKind)).toBe(false);
  });
});

describe("getSolanaOrderCategory / getSolanaOrderTypeLabel", () => {
  it("classifies zero-size market orders as collateral orders", () => {
    expect(getSolanaOrderCategory({ kind: K.MarketIncrease, sizeDeltaUsd: 0n })).toBe("collateral");
    expect(getSolanaOrderCategory({ kind: K.MarketDecrease, sizeDeltaUsd: 0n })).toBe("collateral");
    expect(getSolanaOrderTypeLabel({ kind: K.MarketIncrease, sizeDeltaUsd: 0n }).message).toBe("Deposit Collateral");
    expect(getSolanaOrderTypeLabel({ kind: K.MarketDecrease, sizeDeltaUsd: 0n }).message).toBe("Withdraw Collateral");
  });

  it("keeps non-zero market orders as position orders", () => {
    expect(getSolanaOrderCategory({ kind: K.MarketIncrease, sizeDeltaUsd: 1n })).toBe("position");
    expect(getSolanaOrderTypeLabel({ kind: K.MarketIncrease, sizeDeltaUsd: 1n }).message).toBe("Market Increase");
    expect(getSolanaOrderTypeLabel({ kind: K.MarketDecrease, sizeDeltaUsd: 1n }).message).toBe("Market Decrease");
  });

  it("uses GMTrade labels", () => {
    expect(getSolanaOrderCategory({ kind: K.LimitSwap, sizeDeltaUsd: 0n })).toBe("swap");
    expect(getSolanaOrderTypeLabel({ kind: K.LimitSwap, sizeDeltaUsd: 0n }).message).toBe("Limit Swap");
    expect(getSolanaOrderTypeLabel({ kind: K.LimitIncrease, sizeDeltaUsd: 1n }).message).toBe("Limit Increase");
    expect(getSolanaOrderTypeLabel({ kind: K.LimitDecrease, sizeDeltaUsd: 1n }).message).toBe("Take-Profit");
    expect(getSolanaOrderTypeLabel({ kind: K.StopLossDecrease, sizeDeltaUsd: 1n }).message).toBe("Stop-Loss");
  });
});

describe("getSolanaTriggerThreshold", () => {
  it("matches GMTrade getTriggerThresholdType", () => {
    expect(getSolanaTriggerThreshold(K.LimitIncrease, true)).toBe("<");
    expect(getSolanaTriggerThreshold(K.LimitIncrease, false)).toBe(">");
    expect(getSolanaTriggerThreshold(K.LimitDecrease, true)).toBe(">");
    expect(getSolanaTriggerThreshold(K.LimitDecrease, false)).toBe("<");
    expect(getSolanaTriggerThreshold(K.StopLossDecrease, true)).toBe("<");
    expect(getSolanaTriggerThreshold(K.StopLossDecrease, false)).toBe(">");
    expect(getSolanaTriggerThreshold(K.MarketIncrease, true)).toBeUndefined();
    expect(getSolanaTriggerThreshold(K.LimitSwap, true)).toBeUndefined();
  });
});

describe("getSolanaAcceptableComparator", () => {
  it("increase: long ≤ / short ≥; decrease: long ≥ / short ≤", () => {
    expect(getSolanaAcceptableComparator(K.LimitIncrease, true)).toBe("≤");
    expect(getSolanaAcceptableComparator(K.LimitIncrease, false)).toBe("≥");
    expect(getSolanaAcceptableComparator(K.LimitDecrease, true)).toBe("≥");
    expect(getSolanaAcceptableComparator(K.StopLossDecrease, false)).toBe("≤");
    expect(getSolanaAcceptableComparator(K.MarketDecrease, true)).toBe("≥");
  });
});

describe("sortSolanaOrdersForList", () => {
  it("puts market orders first (newest first), then kind desc / updatedAt asc", () => {
    const orders = [
      { id: "tp-old", kind: K.LimitDecrease, updatedAt: 10n },
      { id: "limit", kind: K.LimitIncrease, updatedAt: 50n },
      { id: "mi-old", kind: K.MarketIncrease, updatedAt: 20n },
      { id: "sl", kind: K.StopLossDecrease, updatedAt: 5n },
      { id: "md-new", kind: K.MarketDecrease, updatedAt: 30n },
      { id: "tp-new", kind: K.LimitDecrease, updatedAt: 40n },
      { id: "swap", kind: K.LimitSwap, updatedAt: 1n },
    ];
    expect(sortSolanaOrdersForList(orders).map((o) => o.id)).toEqual([
      "md-new",
      "mi-old",
      "sl",
      "tp-old",
      "tp-new",
      "limit",
      "swap",
    ]);
  });
});
