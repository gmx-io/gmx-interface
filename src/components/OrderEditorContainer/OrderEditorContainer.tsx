import { useMemo } from "react";

import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectEditingOrder } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { OrderEditor } from "components/Synthetics/OrderEditor/OrderEditor";

export function OrderEditorContainer() {
  const editingOrder = useSelector(selectEditingOrder);
  const [, setEditingOrderKey] = useEditingOrderKeyState();

  const handleClose = useMemo(() => () => setEditingOrderKey(undefined), [setEditingOrderKey]);

  if (!editingOrder) {
    return null;
  }

  return <OrderEditor order={editingOrder} onClose={handleClose} />;
}
