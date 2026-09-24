import { useTriggerCreateUpdateOrder } from '@/hooks/triggerHooks/useTriggerCreateUpdateOrder';
import { OrderInfo } from '@/selectors/order/types';
import { selectOrderEditorAcceptablePrice } from '@/selectors/orderEditor/selectOrderEditorAcceptablePrice';
import { selectOrderEditorIndexTokenDecimals } from '@/selectors/orderEditor/selectOrderEditorIndexTokenDecimals';
import { selectOrderEditorMinOutputAmount } from '@/selectors/orderEditor/selectOrderEditorMinOutputAmount';
import { selectOrderEditorSizeDeltaUsd } from '@/selectors/orderEditor/selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorTriggerPrice } from '@/selectors/orderEditor/selectOrderEditorTriggerPrice';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { useCallback } from 'react';

export function useHandleSubmitOrder(onClose: () => void, order: OrderInfo) {
  const skipPreflight = useAppStore(selectSkipPreflight);
  const sizeDeltaUsd = useAppStore(selectOrderEditorSizeDeltaUsd);
  const acceptablePrice = useAppStore(selectOrderEditorAcceptablePrice);
  const triggerPrice = useAppStore(selectOrderEditorTriggerPrice);
  const minOutputAmount = useAppStore(selectOrderEditorMinOutputAmount);
  const indexTokenDecimals = useAppStore(selectOrderEditorIndexTokenDecimals);

  const { trigger: createUpdateOrder, isSending: isCreatingUpdateOrder } =
    useTriggerCreateUpdateOrder();

  const handleSubmitUpdateOrder = useCallback(() => {
    void createUpdateOrder({
      skipPreflight,
      orderAddress: order.orderAddress,
      sizeDeltaUsd,
      acceptablePrice,
      triggerPrice,
      minOutputAmount,
      indexTokenDecimals,
    }).then(() => {
      onClose();
    });
  }, [
    createUpdateOrder,
    skipPreflight,
    order,
    sizeDeltaUsd,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    indexTokenDecimals,
    onClose,
  ]);

  return [handleSubmitUpdateOrder, isCreatingUpdateOrder] as const;
}
