import { t } from "@lingui/macro";

import { formatAmount, formatBalanceAmount, formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";

import type {
  SolanaCollateralOrderViewModel,
  SolanaOrderViewModel,
  SolanaPositionOrderViewModel,
  SolanaSwapOrderViewModel,
} from "./types";

// Same helpers as positions/solanaPositionFormatters.ts, redeclared here so this module (and its specs) do
// not pull `domain/synthetics/positions` in through `formatLeverage`.
export const SOLANA_ORDER_DASH = "—";
/** GMX EVM tooltip rows fall back to "..." when a value is not available. */
export const SOLANA_ORDER_UNAVAILABLE = "...";

function formatSolanaPrice(value: bigint | undefined): string {
  return value === undefined ? SOLANA_ORDER_DASH : formatUsdPrice(value) ?? SOLANA_ORDER_DASH;
}

/** GMTrade `formatTokenAmount` default (swap amounts). */
const SWAP_AMOUNT_DECIMALS = 4;

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

/** GMX `SizeWithIcon`: "Full position close" for a decrease order closing the whole linked position. */
export function formatSolanaOrderSize(order: SolanaOrderViewModel): string {
  switch (order.category) {
    case "position":
      if (order.isFullClose) return t`Full position close`;
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

type CollateralOrder = SolanaPositionOrderViewModel | SolanaCollateralOrderViewModel;

function isDecreaseOrder(order: CollateralOrder): boolean {
  return order.category === "collateral" ? !order.isDeposit : !order.isIncrease;
}

/** GMX `OrderSize` tooltip row label. */
export function getSolanaCollateralDeltaLabel(order: CollateralOrder): string {
  return isDecreaseOrder(order) ? t`Margin delta` : t`Margin`;
}

/**
 * GMX `OrderSize.getCollateralText`: the margin change in target collateral token units, negative for
 * decreases. A full close shows the live position margin. "..." when the amount cannot be derived.
 */
export function formatSolanaOrderMargin(order: CollateralOrder): string {
  const amount =
    order.category === "position" && order.isFullClose && order.positionCollateralAmount !== undefined
      ? order.positionCollateralAmount
      : order.targetCollateralDeltaAmount;
  if (amount === undefined || order.targetCollateralDecimals === undefined) return SOLANA_ORDER_UNAVAILABLE;
  const signed = isDecreaseOrder(order) ? -amount : amount;
  return formatBalanceAmount(signed, order.targetCollateralDecimals, order.targetCollateralSymbol, {
    isStable: order.targetCollateralIsStable,
  });
}

/** GMX `OrderSize` swap note when the pay token differs from the position collateral. */
export function formatSolanaCollateralSwapNote(order: CollateralOrder): string | undefined {
  if (!order.isCollateralSwap) return undefined;
  const amount =
    order.collateralDecimals === undefined
      ? SOLANA_ORDER_UNAVAILABLE
      : formatBalanceAmount(order.collateralDeltaAmount, order.collateralDecimals, order.collateralSymbol, {
          isStable: order.collateralIsStable,
        });
  const target = order.targetCollateralSymbol;
  return t`${amount} swapped to ${target} when executed`;
}

/** GMX `TriggerPrice`: market orders (incl. deposit / withdraw) show "N/A". */
export function formatSolanaTriggerPrice(order: SolanaOrderViewModel): string {
  switch (order.category) {
    case "collateral":
      return t`N/A`;
    case "swap":
      return order.triggerRatioText && order.ratioLabel ? `${order.triggerRatioText} ${order.ratioLabel}` : SOLANA_ORDER_DASH;
    case "position": {
      if (order.isMarketOrder) return t`N/A`;
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

/**
 * GMX `TriggerPrice` "Acceptable price" row: "N/A" for stop-loss orders, the bare price for market orders
 * and the trigger threshold plus price for limit / take-profit orders.
 */
export function formatSolanaAcceptablePrice(order: SolanaPositionOrderViewModel): string {
  if (order.noAcceptableLimit) return "N/A";
  if (order.acceptablePrice === undefined) return SOLANA_ORDER_UNAVAILABLE;
  const price = formatSolanaOrderPrice(order.acceptablePrice, order.isForexPrecision);
  return order.isMarketOrder || !order.triggerThreshold ? price : `${order.triggerThreshold} ${price}`;
}

/** GMX swap limit order trigger price tooltip. */
export function formatSolanaSwapReceiveText(order: SolanaSwapOrderViewModel): string {
  const minOutput = formatSolanaSwapMinOutput(order);
  return t`Receive at least ${minOutput} if executed. Price updates based on fees and price impact.`;
}

/** GMX trigger order mark price tooltip. */
export function formatSolanaOrderExecutionText(order: SolanaPositionOrderViewModel): string {
  const threshold = order.triggerThreshold ?? "";
  const price = formatSolanaOrderPrice(order.triggerPrice, order.isForexPrecision);
  return t`Executes when oracle price is ${threshold} ${price}`;
}
