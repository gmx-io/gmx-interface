import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import { OrderInfo } from '@/selectors/order/types';
import { useCallback } from 'react';

export function useHandleCancelOrder(onSubmitted?: () => void) {
  const { trigger: cancelOrder } = useTriggerCancelOrder();

  return useCallback(
    (order: OrderInfo) => {
      void cancelOrder({
        skipPreflight: false,
        orderAddress: order.orderAddress.toBase58(),
      }).then(onSubmitted);
    },
    [cancelOrder, onSubmitted]
  );
}
