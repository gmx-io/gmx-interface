import { OrderKind, OrderType } from '@/selectors/order/types';

export function getOrderTypeFromOrderKind(kind: OrderKind): OrderType {
  switch (kind) {
    case 0:
      return OrderType.Liquidation;
    case 1:
      return OrderType.AutoDeleveraging;
    case 2:
      return OrderType.MarketSwap;
    case 3:
      return OrderType.MarketIncrease;
    case 4:
      return OrderType.MarketDecrease;
    case 5:
      return OrderType.LimitSwap;
    case 6:
      return OrderType.LimitIncrease;
    case 7:
      return OrderType.LimitDecrease;
    case 8:
      return OrderType.StopLossDecrease;
  }
}
