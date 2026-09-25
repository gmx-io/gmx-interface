import { describe, expect, it } from "vitest";

import { groupSolanaOrdersByPosition } from "./positionOrders";
import { SOLANA_ORDER_KIND } from "../orders/solanaOrderConstants";
import type { SolanaOrderViewModel, SolanaPositionOrderViewModel } from "../orders/types";

function order(
  key: string,
  kind: number,
  triggerPrice: bigint,
  positionAddress?: string
): SolanaPositionOrderViewModel {
  return {
    key,
    orderAddress: key,
    ownerAddress: "owner",
    marketTokenAddress: "market",
    positionAddress,
    kind,
    typeLabel: { id: key },
    updatedAt: 0n,
    errors: [],
    category: "position",
    isLong: true,
    symbol: "SOL",
    displayMarketName: "SOL/USD",
    isForexPrecision: false,
    sizeDeltaUsd: kind === SOLANA_ORDER_KIND.LimitIncrease ? 100n : -100n,
    isIncrease: kind === SOLANA_ORDER_KIND.LimitIncrease,
    isMarketOrder: false,
    triggerPrice,
    noAcceptableLimit: kind === SOLANA_ORDER_KIND.StopLossDecrease,
    collateralDeltaAmount: 0n,
    collateralSymbol: "USDC",
    targetCollateralTokenAddress: "usdc",
    targetCollateralSymbol: "USDC",
  };
}

describe("groupSolanaOrdersByPosition", () => {
  it("groups limit / TP / SL orders by position and sorts TP ascending, SL descending", () => {
    const orders: SolanaOrderViewModel[] = [
      order("tp-high", SOLANA_ORDER_KIND.LimitDecrease, 300n, "p1"),
      order("sl-low", SOLANA_ORDER_KIND.StopLossDecrease, 50n, "p1"),
      order("tp-low", SOLANA_ORDER_KIND.LimitDecrease, 200n, "p1"),
      order("sl-high", SOLANA_ORDER_KIND.StopLossDecrease, 80n, "p1"),
      order("limit", SOLANA_ORDER_KIND.LimitIncrease, 90n, "p1"),
      order("other-position", SOLANA_ORDER_KIND.LimitDecrease, 1n, "p2"),
      order("market-decrease", SOLANA_ORDER_KIND.MarketDecrease, 0n, "p1"),
      order("detached", SOLANA_ORDER_KIND.LimitDecrease, 1n, undefined),
    ];
    const grouped = groupSolanaOrdersByPosition(orders);
    const p1 = grouped.get("p1")!;
    expect(p1.all.map((o) => o.key)).toEqual(["tp-high", "sl-low", "tp-low", "sl-high", "limit"]);
    expect(p1.takeProfit.map((o) => o.key)).toEqual(["tp-low", "tp-high"]);
    expect(p1.stopLoss.map((o) => o.key)).toEqual(["sl-high", "sl-low"]);
    expect(grouped.get("p2")!.all.map((o) => o.key)).toEqual(["other-position"]);
    expect(grouped.size).toBe(2);
  });

  it("ignores swap and collateral orders", () => {
    const swap = {
      ...order("swap", SOLANA_ORDER_KIND.LimitSwap, 1n, "p1"),
      category: "swap",
    } as unknown as SolanaOrderViewModel;
    expect(groupSolanaOrdersByPosition([swap]).size).toBe(0);
  });
});
