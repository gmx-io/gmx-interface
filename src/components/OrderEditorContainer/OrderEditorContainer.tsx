import { useMemo } from "react";

import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectEditingOrder } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";

import { OrderEditor } from "components/Synthetics/OrderEditor/OrderEditor";

export function OrderEditorContainer() {
  const editingOrder = useSelector(selectEditingOrder);
  const [, setEditingOrderKey] = useEditingOrderKeyState();
  const { setPendingTxns } = usePendingTxns();

  const handleClose = useMemo(() => () => setEditingOrderKey(undefined), [setEditingOrderKey]);

  if (!editingOrder) {
    return null;
  }

  return <OrderEditor order={editingOrder} onClose={handleClose} setPendingTxns={setPendingTxns} />;
}
