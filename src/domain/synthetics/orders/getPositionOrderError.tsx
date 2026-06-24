import { t } from "@lingui/macro";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import {
  OrderType,
  PositionOrderInfo,
  isLimitIncreaseOrderType,
  isStopIncreaseOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { PositionInfoLoaded } from "domain/synthetics/positions";
import { NextPositionValues } from "domain/synthetics/trade";
import { getPositionCloseSizeDeltaUsdForDisplay } from "domain/tpsl/utils";

export function getPositionOrderError({
  positionOrder,
  markPrice,
  sizeDeltaUsd,
  triggerPrice,
  acceptablePrice,
  existingPosition,
  nextPositionValuesForIncrease,
  maxAllowedLeverage,
}: {
  positionOrder: PositionOrderInfo;
  markPrice: bigint | undefined;
  sizeDeltaUsd: bigint | undefined;
  triggerPrice: bigint | undefined;
  acceptablePrice: bigint | undefined;
  existingPosition: PositionInfoLoaded | undefined;
  nextPositionValuesForIncrease: NextPositionValues | undefined;
  maxAllowedLeverage: number | undefined;
}): string | undefined {
  if (markPrice === undefined) {
    return t`Loading...`;
  }

  if (sizeDeltaUsd === undefined || sizeDeltaUsd < 0) {
    return t`Enter an amount`;
  }

  if (triggerPrice === undefined || triggerPrice < 0) {
    return t`Enter a price`;
  }

  if (
    sizeDeltaUsd === positionOrder.sizeDeltaUsd &&
    triggerPrice === positionOrder.triggerPrice! &&
    acceptablePrice === positionOrder.acceptablePrice
  ) {
    return t`Enter a new amount or price`;
  }

  if (isLimitIncreaseOrderType(positionOrder.orderType)) {
    if (positionOrder.isLong) {
      if (triggerPrice >= markPrice) {
        return t`Set limit price below mark price`;
      }
    } else {
      if (triggerPrice <= markPrice) {
        return t`Set limit price above mark price`;
      }
    }
  } else if (isStopIncreaseOrderType(positionOrder.orderType)) {
    if (positionOrder.isLong && triggerPrice <= markPrice) {
      return t`Set stop price above mark price`;
    } else if (!positionOrder.isLong && triggerPrice >= markPrice) {
      return t`Set stop price below mark price`;
    }
  }

  if (isTriggerDecreaseOrderType(positionOrder.orderType)) {
    if (markPrice === undefined) {
      return t`Loading...`;
    }

    const orderSizeDeltaUsdForCompare = getPositionCloseSizeDeltaUsdForDisplay(
      positionOrder.sizeDeltaUsd ?? 0n,
      existingPosition?.sizeInUsd
    );

    if (
      sizeDeltaUsd === orderSizeDeltaUsdForCompare &&
      triggerPrice === (positionOrder.triggerPrice ?? 0n) &&
      acceptablePrice === positionOrder.acceptablePrice
    ) {
      return t`Enter a new size or price`;
    }

    if (existingPosition && sizeDeltaUsd > existingPosition.sizeInUsd) {
      return t`Max close amount exceeded`;
    }

    // A trigger price beyond the current liquidation price is intentionally NOT blocked here.
    // It surfaces as a non-blocking warning (see getTpSlLiqPriceWarning) so users keep full freedom
    // to create or edit TP/SL orders at these prices.

    if (positionOrder.isLong) {
      if (positionOrder.orderType === OrderType.LimitDecrease && triggerPrice <= markPrice) {
        return t`Set trigger price above mark price`;
      }

      if (positionOrder.orderType === OrderType.StopLossDecrease && triggerPrice >= markPrice) {
        return t`Set trigger price below mark price`;
      }
    } else {
      if (positionOrder.orderType === OrderType.LimitDecrease && triggerPrice >= markPrice) {
        return t`Set trigger price below mark price`;
      }

      if (positionOrder.orderType === OrderType.StopLossDecrease && triggerPrice <= markPrice) {
        return t`Set trigger price above mark price`;
      }
    }
  }

  if (isLimitIncreaseOrderType(positionOrder.orderType)) {
    if (
      nextPositionValuesForIncrease?.nextLeverage !== undefined &&
      maxAllowedLeverage !== undefined &&
      nextPositionValuesForIncrease.nextLeverage > maxAllowedLeverage
    ) {
      return t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
    }
  }
}
