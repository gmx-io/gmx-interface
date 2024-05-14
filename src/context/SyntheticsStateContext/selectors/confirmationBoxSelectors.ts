import { createSelector } from "../utils";
import { BigNumber } from "ethers";
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
    sizeDeltaUsd: (existingPosition?.sizeInUsd ?? BigNumber.from(0)).add(
      increaseAmounts?.sizeDeltaUsd ?? BigNumber.from(0)
    ),
    sizeDeltaInTokens: (existingPosition?.sizeInTokens ?? BigNumber.from(0)).add(
      increaseAmounts?.sizeDeltaInTokens ?? BigNumber.from(0)
    ),
    collateralDeltaAmount: (existingPosition?.collateralAmount ?? BigNumber.from(0)).add(
      increaseAmounts?.collateralDeltaAmount ?? BigNumber.from(0)
    ),
    updatedAt: Date.now(),
    updatedAtBlock: BigNumber.from(0),
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
    pnl: BigNumber.from(0),
    pnlPercentage: BigNumber.from(0),
    pnlAfterFees: BigNumber.from(0),
    pnlAfterFeesPercentage: BigNumber.from(0),
    closingFeeUsd: BigNumber.from(0),
    uiFeeUsd: BigNumber.from(0),
    pendingFundingFeesUsd: BigNumber.from(0),
    pendingClaimableFundingFeesUsd: BigNumber.from(0),
  };
});
