import { USD_DECIMALS } from "config/factors";
import type { PositionEditorAtPriceOpenRequest } from "domain/synthetics/trade/usePositionEditorState";
import { calculateDisplayDecimals, formatAmount, formatAmountFree } from "lib/numbers";

/** Minimal shape of the order being replaced; both OrderInfo flavors satisfy it. */
export type MarginDepositReplacedOrder = {
  initialCollateralDeltaAmount: bigint;
  triggerPrice?: bigint;
};

export type MarginDepositPrefill = {
  collateralInputValue: string | undefined;
  triggerPriceInputValue: string | undefined;
};

/** Formats a price into an input-ready string, mirroring OrderEditor's trigger price handling. */
export function formatMarginDepositPriceInput(price: bigint | undefined, visualMultiplier: number | undefined): string {
  if (price === undefined) {
    return "";
  }

  return formatAmount(
    price,
    USD_DECIMALS,
    calculateDisplayDecimals(price, USD_DECIMALS, visualMultiplier),
    undefined,
    undefined,
    visualMultiplier
  );
}

/**
 * Values to apply when an "At price" open request is consumed.
 * Request values win; missing ones fall back to the order being replaced.
 * Returns undefined while a replaced order is still needed but not loaded yet, so the caller can retry later.
 */
export function getMarginDepositPrefill(p: {
  request: PositionEditorAtPriceOpenRequest;
  order: MarginDepositReplacedOrder | undefined;
  collateralTokenDecimals: number | undefined;
  visualMultiplier: number | undefined;
}): MarginDepositPrefill | undefined {
  const { request, order, collateralTokenDecimals, visualMultiplier } = p;

  const needsOrderValues =
    request.replacingOrderKey !== undefined &&
    (request.collateralInputValue === undefined || request.triggerPriceInputValue === undefined);

  if (needsOrderValues && (!order || collateralTokenDecimals === undefined)) {
    return undefined;
  }

  const orderCollateralInputValue =
    order && collateralTokenDecimals !== undefined
      ? formatAmountFree(order.initialCollateralDeltaAmount, collateralTokenDecimals)
      : undefined;

  const orderTriggerPriceInputValue = order
    ? formatMarginDepositPriceInput(order.triggerPrice, visualMultiplier)
    : undefined;

  return {
    collateralInputValue: request.collateralInputValue ?? orderCollateralInputValue,
    triggerPriceInputValue: request.triggerPriceInputValue ?? orderTriggerPriceInputValue,
  };
}
