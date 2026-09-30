import { formatBalanceAmount, formatUsd } from "lib/numbers";

import type { SolanaPositionViewModel } from "./types";

export type SolanaPositionSizeInput = Pick<
  SolanaPositionViewModel,
  "sizeInUsd" | "sizeInTokens" | "indexTokenDecimals" | "symbol"
>;

/**
 * GMX EVM `PositionItem` lets the Size cell toggle between USD and index token amount. The token view
 * needs the index token decimals; without them the raw integer must not be shown as a token amount.
 */
export function canToggleSolanaPositionSize(position: SolanaPositionSizeInput): boolean {
  return position.indexTokenDecimals !== undefined;
}

export function formatSolanaPositionSize(position: SolanaPositionSizeInput, showInTokens: boolean): string {
  if (showInTokens && position.indexTokenDecimals !== undefined) {
    return formatBalanceAmount(position.sizeInTokens, position.indexTokenDecimals, position.symbol);
  }
  return formatUsd(position.sizeInUsd) ?? "—";
}
