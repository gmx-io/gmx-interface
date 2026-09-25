import { SOLANA_ORDER_KIND } from "../orders/solanaOrderConstants";
import type { SolanaOrderViewModel, SolanaPositionOrderViewModel } from "../orders/types";

/** Orders attached to one position, split the way the GMTrade position row uses them. */
export type SolanaPositionOrders = {
  /** Every displayable order of the position (limit increase, take-profit, stop-loss), in list order. */
  all: SolanaPositionOrderViewModel[];
  /** Take-profit (LimitDecrease) orders, lowest trigger price first. */
  takeProfit: SolanaPositionOrderViewModel[];
  /** Stop-loss (StopLossDecrease) orders, highest trigger price first. */
  stopLoss: SolanaPositionOrderViewModel[];
};

const { LimitIncrease, LimitDecrease, StopLossDecrease } = SOLANA_ORDER_KIND;

function compareTrigger(a: SolanaPositionOrderViewModel, b: SolanaPositionOrderViewModel): number {
  const x = a.triggerPrice ?? 0n;
  const y = b.triggerPrice ?? 0n;
  return x === y ? 0 : x < y ? -1 : 1;
}

/**
 * Source: gmx-solana-interface useOnChainPositions.ts (`orderToken` / `tpToken` / `slToken`) and
 * PositionItem.tsx `isMarketOrderShowType` filter. Orders are matched by their position account.
 */
export function groupSolanaOrdersByPosition(
  orders: readonly SolanaOrderViewModel[]
): ReadonlyMap<string, SolanaPositionOrders> {
  const result = new Map<string, SolanaPositionOrders>();
  for (const order of orders) {
    if (order.category !== "position" || !order.positionAddress) continue;
    if (order.kind !== LimitIncrease && order.kind !== LimitDecrease && order.kind !== StopLossDecrease) continue;
    let group = result.get(order.positionAddress);
    if (!group) {
      group = { all: [], takeProfit: [], stopLoss: [] };
      result.set(order.positionAddress, group);
    }
    group.all.push(order);
    if (order.kind === LimitDecrease) group.takeProfit.push(order);
    else if (order.kind === StopLossDecrease) group.stopLoss.push(order);
  }
  for (const group of result.values()) {
    group.takeProfit.sort(compareTrigger);
    group.stopLoss.sort((a, b) => compareTrigger(b, a));
  }
  return result;
}
