import {
  isLimitOrderType,
  isMarketOrderType,
  isSwapOrderType,
} from '@/utils/order/isOrderType';

import { getTradeFlags } from './getTradeFlags';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { TradeFlags } from '@/selectors/trade/types';
import { OrderInfo } from '@/selectors/order/types';

export function getTradeFlagsForOrder(order: OrderInfo): TradeFlags {
  const tradeMode = isMarketOrderType(order.orderType)
    ? TradeMode.Market
    : isLimitOrderType(order.orderType)
      ? TradeMode.Limit
      : TradeMode.Trigger;

  const tradeType = isSwapOrderType(order.orderType)
    ? TradeType.Swap
    : order.isLong
      ? TradeType.Long
      : TradeType.Short;

  return getTradeFlags(tradeType, tradeMode);
}
