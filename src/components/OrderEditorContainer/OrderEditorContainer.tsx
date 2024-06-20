import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectEditingOrder } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { usePendingTxns } from "lib/usePendingTxns";

import { OrderEditor } from "components/Synthetics/OrderEditor/OrderEditor";

export function OrderEditorContainer() {
  const editingOrder = useSelector(selectEditingOrder);
  const [, setEditingOrderKey] = useEditingOrderKeyState();
  const [, setPendingTxns] = usePendingTxns();

  if (!editingOrder) {
    return null;
  }

  return (
    <OrderEditor order={editingOrder} onClose={() => setEditingOrderKey(undefined)} setPendingTxns={setPendingTxns} />
  );
}
