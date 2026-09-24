import { getGmw425Enabled } from '@/config/featureFlagEnable';
import { OrderType, PositionOrderInfo } from '@/selectors/order/types';
import { PositionInfo } from '@/selectors/position/types';
import { isNativeToken } from '../token/isNativeToken';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { BN } from '@coral-xyz/anchor';

type OrderSizeFields = {
  orderType: OrderType;
  sizeDeltaUsd: BN;
};

export function isOrderForPosition(
  order: PositionOrderInfo,
  positionInfo: PositionInfo | undefined
): order is PositionOrderInfo {
  const positionMarketAddress = positionInfo?.marketTokenAddress;
  const positionCollateralAddress = positionInfo?.collateralTokenAddress;
  const positionIsLong = positionInfo?.isLong;

  if (!positionMarketAddress || !positionCollateralAddress) {
    return false;
  }

  let isMatch =
    !isSwapOrderType(order.orderType) &&
    order.marketTokenAddress.equals(positionMarketAddress) &&
    order.isLong === positionIsLong;

  if (isLimitOrderType(order.orderType)) {
    const collateralTokenAddress = isNativeToken(order.collateralTokenAddress)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS
      : order.collateralTokenAddress;
    isMatch =
      isMatch &&
      collateralTokenAddress &&
      collateralTokenAddress.equals(positionCollateralAddress);
  } else if (isTriggerDecreaseOrderType(order.orderType)) {
    isMatch =
      isMatch && order.collateralTokenAddress.equals(positionCollateralAddress);
  }

  return isMatch;
}

export function isOrderForDisplay(orderType: OrderType) {
  const orderTypes = [
    OrderType.LimitIncrease,
    OrderType.LimitSwap,
    OrderType.LimitDecrease,
    OrderType.StopLossDecrease,
    OrderType.Liquidation,
    OrderType.AutoDeleveraging,
    // OrderType.MarketSwap,
  ];

  if (getGmw425Enabled()) {
    orderTypes.push(OrderType.MarketIncrease, OrderType.MarketDecrease);
  }

  return orderTypes.includes(orderType);
}

export function isOrderForFetching(orderType: OrderType) {
  return [
    OrderType.LimitIncrease,
    OrderType.LimitSwap,
    OrderType.LimitDecrease,
    OrderType.StopLossDecrease,
    OrderType.Liquidation,
    OrderType.AutoDeleveraging,
    // OrderType.MarketSwap,
    OrderType.MarketIncrease,
    OrderType.MarketDecrease,
  ].includes(orderType);
}

export function isMarketOrderType(orderType: OrderType) {
  return [
    OrderType.MarketDecrease,
    OrderType.MarketIncrease,
    OrderType.MarketSwap,
  ].includes(orderType);
}

export function isMarketIncreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.MarketIncrease;
}

export function isMarketDecreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.MarketDecrease;
}

export function isLimitOrderType(orderType: OrderType) {
  return [OrderType.LimitIncrease, OrderType.LimitSwap].includes(orderType);
}

export function isTriggerDecreaseOrderType(orderType: OrderType) {
  return [OrderType.LimitDecrease, OrderType.StopLossDecrease].includes(
    orderType
  );
}

export function isDecreaseOrderType(orderType: OrderType) {
  return [
    OrderType.MarketDecrease,
    OrderType.LimitDecrease,
    OrderType.StopLossDecrease,
  ].includes(orderType);
}

export function isIncreaseOrderType(orderType: OrderType) {
  return [OrderType.MarketIncrease, OrderType.LimitIncrease].includes(
    orderType
  );
}

export function isMarketOrderShowType(orderType: OrderType) {
  return [
    OrderType.LimitSwap,
    OrderType.LimitIncrease,
    OrderType.LimitDecrease,
    OrderType.StopLossDecrease
  ].includes(orderType);
}

export function isUserCreatedMarketOrderType(orderType: OrderType) {
  return (
    orderType === OrderType.MarketIncrease ||
    orderType === OrderType.MarketDecrease
  );
}

export function isCollateralDepositOrder(order: OrderSizeFields) {
  return (
    order.orderType === OrderType.MarketIncrease && order.sizeDeltaUsd.isZero()
  );
}

export function isCollateralWithdrawOrder(order: OrderSizeFields) {
  return (
    order.orderType === OrderType.MarketDecrease && order.sizeDeltaUsd.isZero()
  );
}

export function isOrdersListShowType(orderType: OrderType) {
  if (isMarketOrderShowType(orderType)) {
    return true;
  }

  return getGmw425Enabled() && isUserCreatedMarketOrderType(orderType);
}

export function isSwapOrderType(orderType: OrderType) {
  return [OrderType.MarketSwap, OrderType.LimitSwap].includes(orderType);
}

export function isLimitSwapOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitSwap;
}

export function isLiquidationOrderType(orderType: OrderType) {
  return orderType === OrderType.Liquidation;
}

export function isStopLossOrderType(orderType: OrderType) {
  return orderType === OrderType.StopLossDecrease;
}

export function isLimitDecreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitDecrease;
}

export function isLimitIncreaseOrderType(orderType: OrderType) {
  return orderType === OrderType.LimitIncrease;
}

export function isAutoDeleveragingOrderType(orderType: OrderType) {
  return orderType === OrderType.AutoDeleveraging;
}
