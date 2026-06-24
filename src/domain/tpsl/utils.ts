import { t } from "@lingui/macro";

import type { OrderInfo, PositionOrderInfo } from "domain/synthetics/orders";
import { isTriggerDecreaseOrderType, isTwapOrder } from "domain/synthetics/orders";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import type { TokenData } from "domain/synthetics/tokens";
import { DUST_USD } from "lib/legacy";
import { MaxUint256 } from "lib/numbers";

export const FULL_POSITION_CLOSE_SIZE_DELTA_USD = MaxUint256;

export function isFullPositionCloseSizeDeltaUsd(sizeDeltaUsd: bigint | undefined, positionSizeUsd?: bigint) {
  if (sizeDeltaUsd === undefined) {
    return false;
  }

  if (sizeDeltaUsd === FULL_POSITION_CLOSE_SIZE_DELTA_USD) {
    return true;
  }

  if (positionSizeUsd === undefined || positionSizeUsd <= 0n) {
    return false;
  }

  return sizeDeltaUsd >= positionSizeUsd || positionSizeUsd - sizeDeltaUsd < DUST_USD;
}

export function isFullClosePositionOrder(order: OrderInfo, positionSizeUsd?: bigint) {
  if (isTwapOrder(order)) {
    return false;
  }

  return (
    isTriggerDecreaseOrderType(order.orderType) && isFullPositionCloseSizeDeltaUsd(order.sizeDeltaUsd, positionSizeUsd)
  );
}

export function getPositionCloseSizeDeltaUsdForDisplay(sizeDeltaUsd: bigint, positionSizeUsd?: bigint) {
  if (sizeDeltaUsd === FULL_POSITION_CLOSE_SIZE_DELTA_USD) {
    return positionSizeUsd ?? 0n;
  }

  return isFullPositionCloseSizeDeltaUsd(sizeDeltaUsd, positionSizeUsd) && positionSizeUsd !== undefined
    ? positionSizeUsd
    : sizeDeltaUsd;
}

export function getPositionCloseSizeDeltaUsdForPayload(sizeDeltaUsd: bigint, isFullClose: boolean) {
  return isFullClose ? FULL_POSITION_CLOSE_SIZE_DELTA_USD : sizeDeltaUsd;
}

/**
 * Shared, non-blocking warning for TP/SL trigger prices that sit beyond the current liquidation price.
 * Long positions liquidate below mark, shorts above, so the check is direction-only and covers both TP and SL.
 * Returns the warning copy when the trigger is at or beyond the liquidation boundary, otherwise undefined.
 */
export function getTpSlLiqPriceWarning({
  triggerPrice,
  liquidationPrice,
  isLong,
}: {
  triggerPrice: bigint | undefined;
  liquidationPrice: bigint | undefined;
  isLong: boolean;
}): string | undefined {
  if (triggerPrice === undefined || triggerPrice <= 0n) {
    return undefined;
  }

  if (liquidationPrice === undefined || liquidationPrice <= 0n || liquidationPrice === MaxUint256) {
    return undefined;
  }

  const isBeyondLiqPrice = isLong ? triggerPrice <= liquidationPrice : triggerPrice >= liquidationPrice;

  if (!isBeyondLiqPrice) {
    return undefined;
  }

  return t`This trigger price is beyond the current liquidation price. Your position may be liquidated before this TP/SL order can execute.`;
}

export function calculateTotalSizeUsd(p: {
  existingPositionSizeUsd: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
  sizeDeltaUsd: bigint;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  return (p.existingPositionSizeUsd ?? 0n) + p.sizeDeltaUsd;
}

export function calculateTotalSizeInTokens(p: {
  baseSizeInTokens: bigint | undefined;
  increaseSizeDeltaInTokens: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
  positionIndexToken: TokenData | undefined;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  const baseSizeInTokens = p.baseSizeInTokens ?? 0n;

  if (p.increaseSizeDeltaInTokens !== undefined) {
    return baseSizeInTokens + p.increaseSizeDeltaInTokens;
  }

  if (!p.positionIndexToken || p.triggerPrice === undefined || p.sizeDeltaUsd === 0n) {
    return baseSizeInTokens;
  }

  const orderSizeInTokens = convertToTokenAmount(p.sizeDeltaUsd, p.positionIndexToken.decimals, p.triggerPrice) ?? 0n;

  return baseSizeInTokens + orderSizeInTokens;
}

export function getCollateralDeltaAmount(p: {
  collateralDeltaAmount: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  if (p.collateralDeltaAmount !== undefined) {
    return p.collateralDeltaAmount;
  }

  return p.order.initialCollateralDeltaAmount ?? 0n;
}

export function getCollateralDeltaUsd(p: {
  collateralDeltaAmount: bigint;
  collateralDeltaUsd: bigint | undefined;
  isLimitOrStopIncrease: boolean;
  order: PositionOrderInfo | undefined;
}) {
  if (!p.isLimitOrStopIncrease || !p.order) {
    return 0n;
  }

  if (p.collateralDeltaUsd !== undefined) {
    return p.collateralDeltaUsd;
  }

  return (
    convertToUsd(
      p.collateralDeltaAmount,
      p.order.targetCollateralToken.decimals,
      p.order.targetCollateralToken.prices.minPrice
    ) ?? 0n
  );
}
