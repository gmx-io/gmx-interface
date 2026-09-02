import {
  OrderErrors,
  PositionOrderInfo,
  getOrderErrors,
  isIncreaseOrderType,
  isOrderForPosition,
  isTwapOrder,
  sortPositionOrders,
} from "domain/synthetics/orders";
import {
  getOrderIncreaseNextPositionValues,
  getOrderIncreaseProjection,
  getOrderIncreaseResultingPositionMarginState,
} from "domain/synthetics/orders/utils";
import { getIsPositionInfoLoaded, getPositionKey } from "domain/synthetics/positions";
import { getByKey } from "lib/objects";

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
import { selectIsSetAcceptablePriceImpactEnabled } from "./settingsSelectors";
import { makeSelectFindSwapPath } from "./tradeSelectors";

const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;

export const makeSelectOrderExistingPosition = createSelectorFactory((orderKey: string) =>
  createSelector(function selectOrderExistingPosition(q) {
    const order = q((s) => getByKey(selectOrdersInfoData(s), orderKey));

    if (!order) return undefined;

    const positionKey = getPositionKey(
      order.account,
      order.marketAddress,
      order.targetCollateralToken.address,
      order.isLong
    );
    const position = q((s) => getByKey(selectPositionsInfoData(s), positionKey));

    return getIsPositionInfoLoaded(position) ? position : undefined;
  })
);

export const makeSelectOrderIncreaseProjection = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint | undefined, sizeDeltaUsd: bigint | undefined) =>
    createSelector(function selectOrderIncreaseProjection(q) {
      const order = q((s) => getByKey(selectOrdersInfoData(s), orderKey));

      if (!order || !isIncreaseOrderType(order.orderType) || isTwapOrder(order) || sizeDeltaUsd === undefined) {
        return undefined;
      }

      const positionOrder = order as PositionOrderInfo;

      if (!positionOrder.marketInfo) {
        return undefined;
      }

      return getOrderIncreaseProjection({
        order: positionOrder,
        position: q(makeSelectOrderExistingPosition(orderKey)),
        triggerPrice,
        sizeDeltaUsd,
        findSwapPath: q(
          makeSelectFindSwapPath(order.initialCollateralTokenAddress, order.targetCollateralToken.address)
        ),
        uiFeeFactor: q(selectUiFeeFactor),
        chainId: q(selectChainId),
        marketsInfoData: q(selectMarketsInfoData),
        isSetAcceptablePriceImpactEnabled: q(selectIsSetAcceptablePriceImpactEnabled),
        userReferralInfo: q(selectUserReferralInfo),
        proDiscountFactor: q(selectProDiscountFactor),
      });
    })
);

export const makeSelectOrderIncreaseNextPositionValues = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint | undefined, sizeDeltaUsd: bigint | undefined, isPnlInLeverage: boolean) =>
    createSelector(function selectOrderIncreaseNextPositionValues(q) {
      const projection = q(makeSelectOrderIncreaseProjection(orderKey, triggerPrice, sizeDeltaUsd));
      const { minCollateralUsd } = q(selectPositionConstants);

      if (!projection || minCollateralUsd === undefined) {
        return undefined;
      }

      return getOrderIncreaseNextPositionValues({
        projection,
        minCollateralUsd,
        userReferralInfo: q(selectUserReferralInfo),
        isPnlInLeverage,
      });
    })
);

export const makeSelectOrderIncreaseResultingPositionMarginState = createSelectorFactory(
  (orderKey: string, triggerPrice: bigint | undefined, sizeDeltaUsd: bigint | undefined) =>
    createSelector(function selectOrderIncreaseResultingPositionMarginState(q) {
      const projection = q(makeSelectOrderIncreaseProjection(orderKey, triggerPrice, sizeDeltaUsd));
      const { minCollateralUsd } = q(selectPositionConstants);

      if (!projection || minCollateralUsd === undefined) {
        return undefined;
      }

      return getOrderIncreaseResultingPositionMarginState({
        projection,
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

    const isRestingIncrease = isIncreaseOrderType(orderInfo.orderType) && !isTwapOrder(orderInfo);
    const { triggerPrice, sizeDeltaUsd } = orderInfo as PositionOrderInfo;

    const nextPositionValues = isRestingIncrease
      ? q(makeSelectOrderIncreaseNextPositionValues(orderInfo.key, triggerPrice, sizeDeltaUsd, false))
      : undefined;
    const resultingPositionMarginState = isRestingIncrease
      ? q(makeSelectOrderIncreaseResultingPositionMarginState(orderInfo.key, triggerPrice, sizeDeltaUsd))
      : undefined;

    const { minCollateralUsd } = q(selectPositionConstants);
    const userReferralInfo = q(selectUserReferralInfo);

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
      minCollateralUsd,
      userReferralInfo,
      resultingPositionMarginState,
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
