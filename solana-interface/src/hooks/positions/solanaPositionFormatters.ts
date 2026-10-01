import { formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatUsd, formatUsdPrice } from "lib/numbers";

import type { SolanaPositionViewModel } from "./types";
import { formatSolanaOrderPrice } from "../orders/solanaOrderFormatters";
import type { SolanaPositionOrderViewModel } from "../orders/types";

export const SOLANA_POSITION_DASH = "—";
/** GMX EVM tooltip rows and leverage fall back to "..." when a value is not available. */
export const SOLANA_UNAVAILABLE = "...";

export function formatSolanaUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatUsd(value) ?? SOLANA_POSITION_DASH;
}

export function formatSolanaPrice(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatUsdPrice(value) ?? SOLANA_POSITION_DASH;
}

/**
 * SDK returns no liquidation price for fully covered positions; the corrected value may also be <= 0.
 * GMX EVM `formatLiquidationPrice` shows "NA" in that case.
 */
export function formatSolanaLiquidationPrice(value: bigint | undefined): string {
  return value === undefined || value <= 0n ? "NA" : formatSolanaPrice(value);
}

/** GMX EVM `PositionItem`: `formatLeverage(leverage) || "..."`. */
export function formatSolanaLeverage(value: bigint | undefined): string {
  return formatLeverage(value) || SOLANA_UNAVAILABLE;
}

/** Settings "Include PnL in leverage display" picks which derived leverage the list shows. */
export function getSolanaDisplayedLeverage(
  position: Pick<SolanaPositionViewModel, "leverage" | "leverageWithPnl">,
  isPnlInLeverage: boolean
): bigint | undefined {
  return isPnlInLeverage ? position.leverageWithPnl : position.leverage;
}

/** Tooltip row value (GMX EVM `formatUsd(x) || "..."`). */
export function formatSolanaTooltipUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_UNAVAILABLE : formatUsd(value) || SOLANA_UNAVAILABLE;
}

/** Tooltip row value (GMX EVM `formatDeltaUsd(x) || "..."`). */
export function formatSolanaTooltipDeltaUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_UNAVAILABLE : formatDeltaUsd(value) || SOLANA_UNAVAILABLE;
}

/** Signed USD without percentage ("+$1.00" / "-$1.00" / "$0.00"), as GMTrade formats fee rows. */
export function formatSolanaSignedUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatDeltaUsd(value) ?? SOLANA_POSITION_DASH;
}

/**
 * PnL shown under Net Value. GMTrade shows the PnL before fees here (its `showPnlAfterFees`
 * setting defaults to off and this list has no such setting), with a plus sign for zero.
 */
export function formatSolanaDisplayedPnl(position: SolanaPositionViewModel): string {
  if (position.pendingPnl === undefined) return SOLANA_POSITION_DASH;
  return formatDeltaUsd(position.pendingPnl, position.pendingPnlBps, { showPlusForZero: true }) ?? SOLANA_POSITION_DASH;
}

/**
 * GMTrade TP/SL cell: "price（count）" with the dollar sign hidden (`showDollarSign: false`), using the
 * first order of the already sorted list (lowest TP / highest SL). "-" when there are none.
 */
export function formatSolanaTpSlSummary(orders: readonly SolanaPositionOrderViewModel[]): string {
  const first = orders[0];
  if (!first) return "-";
  const price = formatSolanaOrderPrice(first.triggerPrice, first.isForexPrecision).replace("$\u200a", "");
  return `${price}（${orders.length}）`;
}

/** Port of GMTrade `formatPositionEstimatedLiquidationTime` for bigint hours. */
export function formatSolanaEstimatedLiquidationTime(hours: bigint | undefined): string {
  if (hours === undefined || hours <= 0n) return SOLANA_POSITION_DASH;
  const days = hours / 24n;
  if (days > 1000n) return "> 1000 days";
  if (hours < 24n) return `${hours} ${hours === 1n ? "hour" : "hours"}`;
  return `${days} days`;
}
