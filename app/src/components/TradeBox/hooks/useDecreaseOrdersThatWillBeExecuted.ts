import { TriggerThresholdType } from '@/selectors/trade/types';
import { useMemo } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { isTriggerDecreaseOrderType } from '@/utils/order/isOrderType';
import { selectTradeboxMarkPrice } from '@/selectors/tradebox/selectTradeboxMarkPrice';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxSelectedPositionAddress } from '@/selectors/tradebox/selectTradeboxSelectedPositionAddress';
import { makeSelectOrdersByPositionAddress } from '@/selectors/order/makeSelectOrdersByPositionAddress';

export function useDecreaseOrdersThatWillBeExecuted() {
  const markPrice = useAppStore(selectTradeboxMarkPrice);
  const existingPosition = useAppStore(selectTradeboxSelectedPosition);
  const positionKey = useAppStore(selectTradeboxSelectedPositionAddress);
  const positionOrders = useAppStore(
    makeSelectOrdersByPositionAddress(positionKey)
  );

  const existingTriggerOrders = useMemo(
    () =>
      positionOrders.filter((order) =>
        isTriggerDecreaseOrderType(order.orderType)
      ),
    [positionOrders]
  );

  return useMemo(() => {
    if (!existingPosition || markPrice === undefined) {
      return [];
    }

    return existingTriggerOrders.filter((order) => {
      return order.triggerThresholdType === TriggerThresholdType.Above
        ? markPrice.gt(order.triggerPrice)
        : markPrice.lt(order.triggerPrice);
    });
  }, [existingPosition, existingTriggerOrders, markPrice]);
}
