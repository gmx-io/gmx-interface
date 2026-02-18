import type { PositionOrderInfo } from "domain/synthetics/orders";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import type { TokenData } from "domain/synthetics/tokens";

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
