import { formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";

import type { SolanaPositionViewModel } from "./types";

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

export function formatSolanaPnl(position: SolanaPositionViewModel): string {
  if (position.pnlAfterFees === undefined) return SOLANA_POSITION_DASH;
  return formatDeltaUsd(position.pnlAfterFees, position.pnlAfterFeesBps) ?? SOLANA_POSITION_DASH;
}

export function formatSolanaTokenAmount(amount: bigint, decimals: number | undefined, symbol: string): string {
  if (decimals === undefined) return `${amount.toString()} ${symbol}`;
  return formatTokenAmount(amount, decimals, symbol, { useCommas: true }) ?? SOLANA_POSITION_DASH;
}
