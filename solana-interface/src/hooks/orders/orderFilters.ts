import type { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";

import { toSolanaPositionCollateralAddress } from "./orderRules";
import { SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import type { SolanaOrderViewModel } from "./types";
import type { SolanaPositionViewModel } from "../positions/types";

export type SolanaMarketFilterDirection = "long" | "short" | "swap" | "any";

/**
 * Same shape as GMX `MarketFilterLongShortItemData`, with base58 market / mint addresses. Addresses are
 * compared as-is (case-sensitive). Omit `collateralAddress` instead of setting it to undefined: the
 * filter component compares selected items with lodash `isEqual`.
 */
export type SolanaMarketFilterItem = {
  marketAddress: string | "any";
  direction: SolanaMarketFilterDirection;
  collateralAddress?: string;
};

/** GMX order type filter values available on Solana (no TWAP orders). */
export const SOLANA_ORDER_TYPE_FILTER_VALUES: readonly OrderTypeFilterValue[] = [
  "trigger-limit",
  "trigger-take-profit",
  "trigger-stop-loss",
  "swaps-limit",
];

/** Explicit mapping from the on-chain `OrderKind` to the GMX filter value; market and deposit / withdraw orders have none. */
export function getSolanaOrderTypeFilterValue(kind: number): OrderTypeFilterValue | undefined {
  switch (kind) {
    case SOLANA_ORDER_KIND.LimitIncrease:
      return "trigger-limit";
    case SOLANA_ORDER_KIND.LimitDecrease:
      return "trigger-take-profit";
    case SOLANA_ORDER_KIND.StopLossDecrease:
      return "trigger-stop-loss";
    case SOLANA_ORDER_KIND.LimitSwap:
      return "swaps-limit";
    default:
      return undefined;
  }
}

export function matchesSolanaOrderType(
  order: Pick<SolanaOrderViewModel, "kind">,
  typeFilters: readonly OrderTypeFilterValue[]
): boolean {
  if (typeFilters.length === 0) return true;
  const value = getSolanaOrderTypeFilterValue(order.kind);
  return value !== undefined && typeFilters.includes(value);
}

function matchesDirection(order: SolanaOrderViewModel, direction: SolanaMarketFilterDirection): boolean {
  if (direction === "any") return true;
  if (order.category === "swap") return direction === "swap";
  return direction === (order.isLong ? "long" : "short");
}

/** Port of GMX `useOrders.ts` `matchByMarket` on Solana view models. */
export function matchesSolanaMarketFilter(
  order: SolanaOrderViewModel,
  filters: readonly SolanaMarketFilterItem[]
): boolean {
  if (filters.length === 0) return true;

  const pureDirectionFilters = filters.filter((f) => f.marketAddress === "any" && f.direction !== "any");
  if (pureDirectionFilters.length > 0 && !pureDirectionFilters.some((f) => matchesDirection(order, f.direction))) {
    return false;
  }

  const marketFilters = filters.filter((f) => f.marketAddress !== "any");
  if (marketFilters.length === 0) return true;

  if (order.category === "swap") {
    const swapRelevant = new Set(
      marketFilters.filter((f) => f.direction === "any" || f.direction === "swap").map((f) => f.marketAddress)
    );
    const path = order.primarySwapPath.length > 0 ? order.primarySwapPath : [order.marketTokenAddress];
    return swapRelevant.has(path[0]) || swapRelevant.has(path[path.length - 1]);
  }

  const orderCollateral = toSolanaPositionCollateralAddress(order.targetCollateralTokenAddress);
  return marketFilters.some(
    (f) =>
      f.direction !== "swap" &&
      f.marketAddress === order.marketTokenAddress &&
      matchesDirection(order, f.direction) &&
      (f.collateralAddress === undefined || f.collateralAddress === orderCollateral)
  );
}

/** Filters are ANDed across dimensions and ORed within one; empty filters keep every order. Order is preserved. */
export function filterSolanaOrders(
  orders: readonly SolanaOrderViewModel[],
  marketFilters: readonly SolanaMarketFilterItem[],
  typeFilters: readonly OrderTypeFilterValue[]
): SolanaOrderViewModel[] {
  if (marketFilters.length === 0 && typeFilters.length === 0) return [...orders];
  return orders.filter((order) => matchesSolanaMarketFilter(order, marketFilters) && matchesSolanaOrderType(order, typeFilters));
}

/** Positions referenced on chain by at least one order (GMX "Open positions with orders" filter group). */
export function getSolanaPositionsWithOrders<T extends Pick<SolanaPositionViewModel, "positionAddress">>(
  positions: readonly T[],
  orders: readonly Pick<SolanaOrderViewModel, "positionAddress">[]
): T[] {
  const linked = new Set(orders.map((order) => order.positionAddress).filter((address) => address !== undefined));
  return positions.filter((position) => linked.has(position.positionAddress));
}
