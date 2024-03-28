import {
  OrderErrors,
  PositionOrderInfo,
  getOrderErrors,
  isOrderForPosition,
  sortPositionOrders,
} from "domain/synthetics/orders";
import { createEnhancedSelector, createSelectorFactory } from "../utils";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { selectMarketsInfoData, selectPositionsInfoData, selectUiFeeFactor } from "./globalSelectors";
import { makeSelectSwapRoutes } from "./tradeSelectors";

const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;

export const makeSelectOrderErrorByOrderKey = createSelectorFactory((orderId: string | undefined) =>
  createEnhancedSelector(function selectOrderErrorByOrderId(q): OrderErrors {
    const orderInfo = q((s) => (orderId ? selectOrdersInfoData(s)?.[orderId] : undefined));
    const positionsInfoData = q(selectPositionsInfoData);
    const marketsInfoData = q(selectMarketsInfoData);

    if (!orderInfo) return { errors: [], level: undefined };
    if (!marketsInfoData) return { errors: [], level: undefined };

    const uiFeeFactor = q(selectUiFeeFactor);
    const { findSwapPath } = q(
      makeSelectSwapRoutes(orderInfo.initialCollateralToken.address, orderInfo.targetCollateralToken.address)
    );

    const { errors, level } = getOrderErrors({
      order: orderInfo,
      positionsInfoData,
      marketsInfoData,
      findSwapPath,
      uiFeeFactor,
    });

    return { errors, level };
  })
);

export const makeSelectOrdersWithErrorsByPositionKey = createSelectorFactory((positionKey: string | undefined) =>
  createEnhancedSelector(function selectOrdersByPositionKey(q) {
    if (!positionKey) {
      q(() => null);
      return [];
    }

    const ordersInfoData = q(selectOrdersInfoData);
    const orders = Object.values(ordersInfoData || {});
    const positionOrders = orders.filter((order) => isOrderForPosition(order, positionKey)) as PositionOrderInfo[];

    sortPositionOrders(positionOrders);

    return positionOrders.map((order) => {
      const selector = makeSelectOrderErrorByOrderKey(order.key);
      const orderErrors = q(selector);
      return { order, orderErrors };
    });
  })
);

export const selectOrderErrorsByOrderKeyMap = createEnhancedSelector(function selectOrderErrorByOrderKeyMap(q) {
  const ordersInfoData = q(selectOrdersInfoData);
  const res: Record<string, OrderErrors> = {};

  Object.values(ordersInfoData || {}).forEach((order) => {
    const selector = makeSelectOrderErrorByOrderKey(order.key);
    res[order.key] = q(selector);
  });

  return res;
});

export const selectOrderErrorsCount = createEnhancedSelector(function selectOrderErrorsCount(q) {
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

export const selectOrdersCount = createEnhancedSelector(function selectOrdersCount(q) {
  const ordersInfoData = q(selectOrdersInfoData);
  return Object.keys(ordersInfoData || {}).length;
});
