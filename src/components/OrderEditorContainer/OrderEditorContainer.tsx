import { useMemo } from "react";

import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectOrderEditorOrder } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { OrderEditor } from "components/Synthetics/OrderEditor/OrderEditor";

export function OrderEditorContainer() {
  const editingOrder = useSelector(selectOrderEditorOrder);
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();

  const handleClose = useMemo(() => () => setEditingOrderState(undefined), [setEditingOrderState]);

  if (!editingOrderState || !editingOrder) {
    return null;
  }

  return <OrderEditor order={editingOrder} source={editingOrderState.source} onClose={handleClose} />;
}
