import { t } from "@lingui/macro";

import { formatAmount, formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";

import type {
  SolanaCollateralOrderViewModel,
  SolanaOrderViewModel,
  SolanaPositionOrderViewModel,
  SolanaSwapOrderViewModel,
} from "./types";

// Same helpers as positions/solanaPositionFormatters.ts, redeclared here so this module (and its specs) do
// not pull `domain/synthetics/positions` in through `formatLeverage`.
export const SOLANA_ORDER_DASH = "—";

function formatSolanaPrice(value: bigint | undefined): string {
  return value === undefined ? SOLANA_ORDER_DASH : formatUsdPrice(value) ?? SOLANA_ORDER_DASH;
}

/** GMTrade `formatTokenAmount` default (swap amounts). */
const SWAP_AMOUNT_DECIMALS = 4;
/** GMTrade `formatAmount` default (collateral delta tooltip). */
const COLLATERAL_AMOUNT_DECIMALS = 5;

function formatSolanaTokenAmount(
  amount: bigint,
  decimals: number | undefined,
  symbol: string,
  displayDecimals: number
): string {
  if (decimals === undefined) return `${amount.toString()} ${symbol}`;
  return formatTokenAmount(amount, decimals, symbol, { useCommas: true, displayDecimals }) ?? SOLANA_ORDER_DASH;
}
/** GMTrade shows forex market prices with a fixed 5 decimals. */
const FOREX_PRICE_DECIMALS = 5;
/** GMTrade shows swap exchange rates with 3 decimals. */
export const SWAP_RATIO_DECIMALS = 3;

/** Values carry 30 decimals (see `SolanaPositionViewModel` unit conventions). */
export function formatSolanaOrderPrice(value: bigint | undefined, isForexPrecision: boolean): string {
  if (value === undefined) return SOLANA_ORDER_DASH;
  if (isForexPrecision) return formatUsd(value, { displayDecimals: FOREX_PRICE_DECIMALS }) ?? SOLANA_ORDER_DASH;
  return formatSolanaPrice(value);
}

/** Integer division rendered with `decimals` truncated decimal places (GMTrade `formatDivision`). */
export function formatBigintDivision(numerator: bigint, denominator: bigint, decimals = SWAP_RATIO_DECIMALS): string {
  if (denominator === 0n) return SOLANA_ORDER_DASH;
  const scale = 10n ** BigInt(decimals);
  const scaled = (numerator * scale) / denominator;
  const whole = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(decimals, "0");
  return decimals === 0 ? whole.toString() : `${whole.toString()}.${fraction}`;
}

/** Amount with `decimals` shown at `displayDecimals` (GMTrade `formatAmount(..., 3, true)`). */
export function formatSolanaRatioAmount(amount: bigint, decimals: number, displayDecimals = SWAP_RATIO_DECIMALS): string {
  return formatAmount(amount, decimals, displayDecimals, true);
}

export function formatSolanaOrderSize(order: SolanaOrderViewModel): string {
  switch (order.category) {
    case "position":
      return formatUsd(order.sizeDeltaUsd, { displayPlus: true }) ?? SOLANA_ORDER_DASH;
    case "collateral":
      return "$0";
    case "swap":
      return formatSolanaSwapAmount(order.fromAmount, order.fromDecimals, order.fromSymbol);
  }
}

export function formatSolanaSwapAmount(amount: bigint, decimals: number | undefined, symbol: string | undefined): string {
  return formatSolanaTokenAmount(amount, decimals, symbol ?? "", SWAP_AMOUNT_DECIMALS);
}

export function formatSolanaSwapMinOutput(order: SolanaSwapOrderViewModel): string {
  return formatSolanaSwapAmount(order.toMinAmount, order.toDecimals, order.toSymbol);
}

/** `±amount SYMBOL`: deposit `+`, withdraw `-`, market orders with size `+`, otherwise unsigned. */
export function formatSolanaCollateralDelta(
  order: SolanaPositionOrderViewModel | SolanaCollateralOrderViewModel
): string {
  const amount = formatSolanaTokenAmount(
    order.collateralDeltaAmount,
    order.collateralDecimals,
    order.collateralSymbol,
    COLLATERAL_AMOUNT_DECIMALS
  );
  if (order.category === "collateral") return `${order.isDeposit ? "+" : "-"}${amount}`;
  return order.isMarketOrder ? `+${amount}` : amount;
}

export function getSolanaCollateralDeltaLabel(order: SolanaPositionOrderViewModel | SolanaCollateralOrderViewModel): string {
  if (order.category === "collateral" || order.isMarketOrder || !order.isIncrease) return t`Collateral Delta`;
  return t`Collateral`;
}

export function formatSolanaTriggerPrice(order: SolanaOrderViewModel): string {
  switch (order.category) {
    case "collateral":
      return SOLANA_ORDER_DASH;
    case "swap":
      return order.triggerRatioText && order.ratioLabel ? `${order.triggerRatioText} ${order.ratioLabel}` : SOLANA_ORDER_DASH;
    case "position": {
      if (order.isMarketOrder) return t`(Market)`;
      const price = formatSolanaOrderPrice(order.triggerPrice, order.isForexPrecision);
      return order.triggerThreshold ? `${order.triggerThreshold} ${price}` : price;
    }
  }
}

export function formatSolanaMarkPrice(order: SolanaOrderViewModel): string {
  switch (order.category) {
    case "collateral":
      return SOLANA_ORDER_DASH;
    case "swap":
      return order.markRatioText && order.ratioLabel ? `${order.markRatioText} ${order.ratioLabel}` : SOLANA_ORDER_DASH;
    case "position":
      return formatSolanaOrderPrice(order.markPrice, order.isForexPrecision);
  }
}

export function formatSolanaAcceptablePrice(order: SolanaPositionOrderViewModel): string {
  if (order.noAcceptableLimit) return t`No limit`;
  if (order.acceptablePrice === undefined) return SOLANA_ORDER_DASH;
  const price = formatSolanaOrderPrice(order.acceptablePrice, order.isForexPrecision);
  return order.acceptableComparator ? `${order.acceptableComparator} ${price}` : price;
}
