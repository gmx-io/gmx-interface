import { createSelector } from "../utils";
import {
  selectTradeboxSelectedPositionKey,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxCollateralToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTriggerPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxNextPositionValues,
} from "./tradeboxSelectors";
import { isStopLossOrderType, isLimitDecreaseOrderType, isLimitIncreaseOrderType } from "domain/synthetics/orders";
import { getPendingMockPosition } from "domain/synthetics/positions";

import { makeSelectOrdersByPositionKey } from "../selectors/orderSelectors";

export const selectConfirmationBoxExistingSlOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isStopLossOrderType(order.orderType));
});

export const selectConfirmationBoxExistingTpOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isLimitDecreaseOrderType(order.orderType));
});

export const selectConfirmationBoxExistingLimitOrders = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

  return positionOrders?.filter((order) => isLimitIncreaseOrderType(order.orderType));
});

export const selectConfirmationBoxMockPosition = createSelector((q) => {
  const positionKey = q(selectTradeboxSelectedPositionKey);
  const collateralToken = q(selectTradeboxCollateralToken);
  const marketInfo = q(selectTradeboxMarketInfo);
  const existingPosition = q(selectTradeboxSelectedPosition);
  const tradeFlags = q(selectTradeboxTradeFlags);
  const nextPositionValues = q(selectTradeboxNextPositionValues);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const triggerPrice = q(selectTradeboxTriggerPrice);

  if (!positionKey || !marketInfo || !collateralToken || !increaseAmounts || !nextPositionValues) return;

  const mockPosition = getPendingMockPosition({
    isIncrease: tradeFlags.isIncrease,
    positionKey,
    sizeDeltaUsd: (existingPosition?.sizeInUsd ?? 0n) + (increaseAmounts?.sizeDeltaUsd ?? 0n),
    sizeDeltaInTokens: (existingPosition?.sizeInTokens ?? 0n) + (increaseAmounts?.sizeDeltaInTokens ?? 0n),
    collateralDeltaAmount: (existingPosition?.collateralAmount ?? 0n) + (increaseAmounts?.collateralDeltaAmount ?? 0n),
    updatedAt: Date.now(),
    updatedAtBlock: 0n,
  });

  if (!mockPosition) return;

  return {
    ...mockPosition,
    marketInfo,
    indexToken: marketInfo.indexToken,
    collateralToken,
    pnlToken: tradeFlags.isLong ? marketInfo.longToken : marketInfo.shortToken,
    markPrice: nextPositionValues.nextEntryPrice!,
    entryPrice: nextPositionValues.nextEntryPrice,
    triggerPrice: tradeFlags.isLimit ? triggerPrice : undefined,
    liquidationPrice: nextPositionValues.nextLiqPrice,
    collateralUsd: increaseAmounts?.initialCollateralUsd,
    remainingCollateralUsd: increaseAmounts?.collateralDeltaUsd,
    remainingCollateralAmount: increaseAmounts?.collateralDeltaAmount,
    netValue: increaseAmounts?.collateralDeltaUsd,
    hasLowCollateral: false,
    leverage: nextPositionValues.nextLeverage,
    leverageWithPnl: nextPositionValues.nextLeverage,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
  };
});
