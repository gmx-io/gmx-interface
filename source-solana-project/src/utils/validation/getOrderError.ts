import { USD_DECIMALS } from '@/config/constants';
import { Order, OrderType } from '@/selectors/order/types';
import { PositionInfo, PositionsInfo } from '@/selectors/position/types';
import { expandDecimals } from '@/utils/legacy/decimals';
import { getPositionForOrder } from '@/utils/order/getPositionForOrder';
import { t } from '@lingui/macro';
import { toBN } from 'gmsol';

export function getOrderError(
  order: Order,
  positionsMap: PositionsInfo,
  position: PositionInfo
) {
  if (
    order.orderType !== OrderType.MarketDecrease &&
    order.orderType !== OrderType.LimitDecrease &&
    order.orderType !== OrderType.StopLossDecrease
  ) {
    return;
  }

  const positionForOrder = position
    ? position
    : getPositionForOrder(order, positionsMap);

  if (!positionForOrder) {
    return t`No open position, order cannot be executed unless a position is opened`;
  }
  if (positionForOrder.sizeInTokens.lt(order.sizeDeltaUsd)) {
    return t`Order size is bigger than position, will only be executable if position increases`;
  }

  if (positionForOrder.sizeInTokens.gt(order.sizeDeltaUsd)) {
    if (
      positionForOrder.sizeInTokens
        .sub(order.sizeDeltaUsd)
        .lt(positionForOrder.collateralUsd)
    ) {
      return t`Order cannot be executed as it would reduce the position's leverage below 1`;
    }
    if (
      positionForOrder.sizeInTokens
        .sub(order.sizeDeltaUsd)
        .lt(expandDecimals(toBN(5), USD_DECIMALS))
    ) {
      return t`Order cannot be executed as the remaining position would be smaller than $5.00`;
    }
  }
}
