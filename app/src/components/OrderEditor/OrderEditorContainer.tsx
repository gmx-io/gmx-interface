import { OrderEditor } from '@/components/OrderEditor/OrderEditor';
import { OrderInfo } from '@/selectors/order/types';
import { selectSetOrderEditorEditingOrderAddress } from '@/selectors/orderEditor/baseSelectors';
import { selectOrderEditorEditingOrder } from '@/selectors/orderEditor/selectOrderEditorEditingOrder';
import { useAppStore } from '@/zustand/useAppStore';
import { useMemo } from 'react';

export function OrderEditorContainer() {
  const editingOrder = useAppStore(selectOrderEditorEditingOrder);
  const setEditingOrderAddress = useAppStore(
    selectSetOrderEditorEditingOrderAddress
  );

  const handleClose = useMemo(
    () => () => setEditingOrderAddress(undefined),
    [setEditingOrderAddress]
  );

  if (!editingOrder) {
    return null;
  }

  return (
    <OrderEditor order={editingOrder as OrderInfo} onClose={handleClose} />
  );
}
