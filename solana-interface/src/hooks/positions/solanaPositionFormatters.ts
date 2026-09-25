import { formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";

import type { SolanaPositionViewModel } from "./types";
import { formatSolanaOrderPrice } from "../orders/solanaOrderFormatters";
import type { SolanaPositionOrderViewModel } from "../orders/types";

export const SOLANA_POSITION_DASH = "—";

export function formatSolanaUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatUsd(value) ?? SOLANA_POSITION_DASH;
}

export function formatSolanaPrice(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatUsdPrice(value) ?? SOLANA_POSITION_DASH;
}

/** SDK returns no liquidation price for fully covered positions; the corrected value may also be <= 0. */
export function formatSolanaLiquidationPrice(value: bigint | undefined): string {
  return value === undefined || value <= 0n ? SOLANA_POSITION_DASH : formatSolanaPrice(value);
}

export function formatSolanaLeverage(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatLeverage(value) ?? SOLANA_POSITION_DASH;
}

/** Signed USD without percentage ("+$1.00" / "-$1.00" / "$0.00"), as GMTrade formats fee rows. */
export function formatSolanaSignedUsd(value: bigint | undefined): string {
  return value === undefined ? SOLANA_POSITION_DASH : formatDeltaUsd(value) ?? SOLANA_POSITION_DASH;
}

/** Tooltip "PnL After Fees" row. */
export function formatSolanaPnlAfterFees(position: SolanaPositionViewModel): string {
  if (position.pnlAfterFees === undefined) return SOLANA_POSITION_DASH;
  return formatDeltaUsd(position.pnlAfterFees, position.pnlAfterFeesBps) ?? SOLANA_POSITION_DASH;
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

export function formatSolanaTokenAmount(amount: bigint, decimals: number | undefined, symbol: string): string {
  if (decimals === undefined) return `${amount.toString()} ${symbol}`;
  return formatTokenAmount(amount, decimals, symbol, { useCommas: true }) ?? SOLANA_POSITION_DASH;
}
