import {
  OrderErrors,
  PositionOrderInfo,
  getOrderErrors,
  isIncreaseOrderType,
  isLimitIncreaseOrderType,
  isOrderForPosition,
  isStopIncreaseOrderType,
  isTwapOrder,
  sortPositionOrders,
} from "domain/synthetics/orders";
import { getOrderIncreaseResultingPositionMarginState } from "domain/synthetics/orders/utils";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector, createSelectorFactory } from "../utils";
import {
  selectChainId,
  selectJitLiquidityMap,
  selectMarketsInfoData,
  selectPositionConstants,
  selectProDiscountFactor,
  selectPositionsInfoData,
  selectUiFeeFactor,
  selectUserReferralInfo,
} from "./globalSelectors";
import { makeSelectOrderEditorNextPositionValuesForIncrease } from "./orderEditorSelectors";
import { selectIsSetAcceptablePriceImpactEnabled } from "./settingsSelectors";
import { makeSelectFindSwapPath } from "./tradeSelectors";

const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;

const makeSelectOrderIncreaseResultingPositionMarginState = createSelectorFactory((orderKey: string) =>
  createSelector(function selectOrderIncreaseResultingPositionMarginState(q) {
    const order = q((s) => selectOrdersInfoData(s)?.[orderKey]);

    if (!order || !isIncreaseOrderType(order.orderType) || isTwapOrder(order)) {
      return undefined;
    }

    const positionOrder = order as PositionOrderInfo;
    const { minCollateralUsd } = q(selectPositionConstants);

    if (!positionOrder.marketInfo || minCollateralUsd === undefined) {
      return undefined;
    }

    return getOrderIncreaseResultingPositionMarginState({
      order: positionOrder,
      position: q((s) =>
        Object.values(selectPositionsInfoData(s) || {}).find((pos) => isOrderForPosition(order, pos.key))
      ),
      triggerPrice: positionOrder.triggerPrice,
      sizeDeltaUsd: positionOrder.sizeDeltaUsd,
      findSwapPath: q(
        makeSelectFindSwapPath(order.initialCollateralToken.address, order.targetCollateralToken.address)
      ),
      uiFeeFactor: q(selectUiFeeFactor),
      chainId: q(selectChainId),
      marketsInfoData: q(selectMarketsInfoData),
      isSetAcceptablePriceImpactEnabled: q(selectIsSetAcceptablePriceImpactEnabled),
      minCollateralUsd,
      userReferralInfo: q(selectUserReferralInfo),
      proDiscountFactor: q(selectProDiscountFactor),
    });
  })
);

export const makeSelectOrderErrorByOrderKey = createSelectorFactory((orderId: string | undefined) =>
  createSelector(function selectOrderErrorByOrderId(q): OrderErrors {
    const orderInfo = q((s) => (orderId ? selectOrdersInfoData(s)?.[orderId] : undefined));
    const positionsInfoData = q(selectPositionsInfoData);
    const marketsInfoData = q(selectMarketsInfoData);
    const chainId = q(selectChainId);
    const isSetAcceptablePriceImpactEnabled = q(selectIsSetAcceptablePriceImpactEnabled);

    if (!orderInfo) return { errors: [], level: undefined };
    if (!marketsInfoData) return { errors: [], level: undefined };

    const uiFeeFactor = q(selectUiFeeFactor);
    const findSwapPath = q(
      makeSelectFindSwapPath(orderInfo.initialCollateralToken.address, orderInfo.targetCollateralToken.address)
    );

    const jitLiquidityMap = q(selectJitLiquidityMap);

    const nextPositionValues =
      orderInfo &&
      (isLimitIncreaseOrderType(orderInfo.orderType) || isStopIncreaseOrderType(orderInfo.orderType)) &&
      (orderInfo as PositionOrderInfo).triggerPrice !== undefined
        ? q(
            makeSelectOrderEditorNextPositionValuesForIncrease(
              orderInfo.key,
              (orderInfo as PositionOrderInfo).triggerPrice!
            )
          )
        : undefined;

    const { errors, level } = getOrderErrors({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
      findSwapPath,
      uiFeeFactor,
      chainId,
      isSetAcceptablePriceImpactEnabled,
      jitLiquidityMap,
      nextPositionValues,
      resultingPositionMarginState: q(makeSelectOrderIncreaseResultingPositionMarginState(orderInfo.key)),
    });

    return { errors, level };
  })
);

export const makeSelectOrdersByPositionKey = createSelectorFactory((positionKey: string | undefined) =>
  createSelector(function selectOrdersByPositionKey(q) {
    if (!positionKey) {
      q(() => null);
      return [];
    }

    const ordersInfoData = q(selectOrdersInfoData);
    const orders = Object.values(ordersInfoData || {});
    return orders.filter((order) => isOrderForPosition(order, positionKey)) as PositionOrderInfo[];
  })
);

export const makeSelectOrdersWithErrorsByPositionKey = createSelectorFactory((positionKey: string | undefined) =>
  createSelector(function selectOrdersByPositionKey(q) {
    const positionOrders = q(makeSelectOrdersByPositionKey(positionKey));

    sortPositionOrders(positionOrders);

    return positionOrders.map((order) => {
      const selector = makeSelectOrderErrorByOrderKey(order.key);
      const orderErrors = q(selector);
      return { order, orderErrors };
    });
  })
);

export const selectOrderErrorsCount = createSelector(function selectOrderErrorsCount(q) {
  const ordersInfoData = q(selectOrdersInfoData);
  const orders = Object.values(ordersInfoData || {});
  const res = {
    warnings: 0,
    errors: 0,
  };

  orders.forEach((order) => {
    const selector = makeSelectOrderErrorByOrderKey(order.key);
    const x = q(selector);
    if (!x) return false;
    if (x.level === "error") res.errors++;
    if (x.level === "warning") res.warnings++;
  });

  return res;
});

export const selectOrdersCount = createSelector(function selectOrdersCount(q) {
  const ordersInfoData = q(selectOrdersInfoData);
  return Object.keys(ordersInfoData || {}).length;
});
