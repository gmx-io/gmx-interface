import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

import { SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import type { RawSolanaOrder, SolanaAcceptableComparator, SolanaOrderCategory, SolanaTriggerThreshold } from "./types";

const { MarketIncrease, MarketDecrease, LimitSwap, LimitIncrease, LimitDecrease, StopLossDecrease } = SOLANA_ORDER_KIND;

/** Source: gmx-solana-interface `isOrdersListShowType` with GMW_425 enabled (graduated in every environment). */
export function isOrdersListShowKind(kind: number): boolean {
  return (
    kind === LimitSwap ||
    kind === LimitIncrease ||
    kind === LimitDecrease ||
    kind === StopLossDecrease ||
    kind === MarketIncrease ||
    kind === MarketDecrease
  );
}

export function isIncreaseKind(kind: number): boolean {
  return kind === MarketIncrease || kind === LimitIncrease;
}

/** MarketIncrease / MarketDecrease created by the user (`isUserCreatedMarketOrderType`). */
export function isMarketKind(kind: number): boolean {
  return kind === MarketIncrease || kind === MarketDecrease;
}

export function isCollateralDepositOrder(order: Pick<RawSolanaOrder, "kind" | "sizeDeltaUsd">): boolean {
  return order.kind === MarketIncrease && order.sizeDeltaUsd === 0n;
}

export function isCollateralWithdrawOrder(order: Pick<RawSolanaOrder, "kind" | "sizeDeltaUsd">): boolean {
  return order.kind === MarketDecrease && order.sizeDeltaUsd === 0n;
}

export function getSolanaOrderCategory(order: Pick<RawSolanaOrder, "kind" | "sizeDeltaUsd">): SolanaOrderCategory {
  if (order.kind === LimitSwap) return "swap";
  if (isCollateralDepositOrder(order) || isCollateralWithdrawOrder(order)) return "collateral";
  return "position";
}

const ORDER_TYPE_LABELS: Record<number, MessageDescriptor> = {
  [SOLANA_ORDER_KIND.MarketSwap]: msg`Market Swap`,
  [LimitSwap]: msg`Limit Swap`,
  [MarketIncrease]: msg`Market Increase`,
  [LimitIncrease]: msg`Limit Increase`,
  [MarketDecrease]: msg`Market Decrease`,
  [LimitDecrease]: msg`Take-Profit`,
  [StopLossDecrease]: msg`Stop-Loss`,
  [SOLANA_ORDER_KIND.Liquidation]: msg`Liquidation`,
  [SOLANA_ORDER_KIND.AutoDeleveraging]: msg`Auto Deleveraging`,
};

/** Source: gmx-solana-interface `getOrdersListTypeLabel` (GMW_425 branch). */
export function getSolanaOrderTypeLabel(order: Pick<RawSolanaOrder, "kind" | "sizeDeltaUsd">): MessageDescriptor {
  if (isCollateralDepositOrder(order)) return msg`Deposit Collateral`;
  if (isCollateralWithdrawOrder(order)) return msg`Withdraw Collateral`;
  return ORDER_TYPE_LABELS[order.kind] ?? msg`Unknown Order Type`;
}

/** Source: gmx-solana-interface `getTriggerThresholdType`. */
export function getSolanaTriggerThreshold(kind: number, isLong: boolean): SolanaTriggerThreshold | undefined {
  if (kind === LimitIncrease) return isLong ? "<" : ">";
  if (kind === LimitDecrease) return isLong ? ">" : "<";
  if (kind === StopLossDecrease) return isLong ? "<" : ">";
  return undefined;
}

/** Source: gmx-solana-interface `formatAcceptablePriceDisplay` comparator rules. */
export function getSolanaAcceptableComparator(kind: number, isLong: boolean): SolanaAcceptableComparator {
  if (isIncreaseKind(kind)) return isLong ? "≤" : "≥";
  return isLong ? "≥" : "≤";
}

function compareBigint(a: bigint, b: bigint): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * GMTrade list order: user-created market orders first (newest first), then the remaining orders in
 * fetch order (kind descending, then `updatedAt` ascending).
 */
export function sortSolanaOrdersForList<T extends Pick<RawSolanaOrder, "kind" | "updatedAt">>(orders: readonly T[]): T[] {
  const marketOrders = orders.filter((order) => isMarketKind(order.kind)).sort((a, b) => compareBigint(b.updatedAt, a.updatedAt));
  const others = orders
    .filter((order) => !isMarketKind(order.kind))
    .sort((a, b) => b.kind - a.kind || compareBigint(a.updatedAt, b.updatedAt));
  return [...marketOrders, ...others];
}
