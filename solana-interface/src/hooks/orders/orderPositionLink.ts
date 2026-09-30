import { SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import type { SolanaOrderViewModel, SolanaPositionOrderViewModel } from "./types";
import type { SolanaPositionViewModel } from "../positions/types";

export type SolanaOrderLinkedPosition = Pick<SolanaPositionViewModel, "positionAddress" | "sizeInUsd" | "collateralAmount">;

/** Source: gmx-solana-interface `DUST_USD` (0.00001 USD), here in 30-decimal GMX USD. */
export const SOLANA_FULL_CLOSE_DUST_USD = 10n ** 25n;

const { MarketDecrease, LimitDecrease, StopLossDecrease } = SOLANA_ORDER_KIND;

/**
 * Source: gmx-solana-interface `getIsFullClose`: a decrease order closes the whole position when its size
 * reaches the position size, or leaves less than the dust threshold. There is no on-chain flag for this.
 */
export function isSolanaFullCloseOrder(
  order: Pick<SolanaPositionOrderViewModel, "kind" | "sizeDeltaUsd">,
  positionSizeInUsd: bigint | undefined
): boolean {
  if (order.kind !== MarketDecrease && order.kind !== LimitDecrease && order.kind !== StopLossDecrease) return false;
  if (positionSizeInUsd === undefined || positionSizeInUsd <= 0n) return false;
  const size = -order.sizeDeltaUsd;
  return size >= positionSizeInUsd || positionSizeInUsd - size < SOLANA_FULL_CLOSE_DUST_USD;
}

/** Joins a position order with the wallet position it references on chain (`params.position`). */
export function linkSolanaOrderToPosition(
  order: SolanaOrderViewModel,
  positionByAddress: ReadonlyMap<string, SolanaOrderLinkedPosition>
): SolanaOrderViewModel {
  if (order.category !== "position" || !order.positionAddress) return order;
  const position = positionByAddress.get(order.positionAddress);
  if (!position) return order;
  return {
    ...order,
    isFullClose: isSolanaFullCloseOrder(order, position.sizeInUsd),
    positionCollateralAmount: position.collateralAmount,
  };
}
