import { USD_DECIMALS } from "config/factors";
import type { PositionEditorAtPriceOpenRequest } from "domain/synthetics/trade/usePositionEditorState";
import { calculateDisplayDecimals, formatAmount, formatAmountFree } from "lib/numbers";

export type MarginDepositReplacedOrder = {
  initialCollateralDeltaAmount: bigint;
  triggerPrice?: bigint;
};

export type MarginDepositPrefill = {
  collateralInputValue: string | undefined;
  triggerPriceInputValue: string | undefined;
};

/** Mirrors OrderEditor's trigger price input formatting. */
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

/** Request values win, the replaced order fills the rest; undefined until that order loads (caller retries). */
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
