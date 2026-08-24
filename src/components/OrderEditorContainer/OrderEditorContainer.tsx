import { useMemo } from "react";

import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectOrderEditorOrder } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { OrderEditor } from "components/OrderEditor/OrderEditor";

export function OrderEditorContainer() {
  const editingOrder = useSelector(selectOrderEditorOrder);
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const editingPosition = usePositionEditorPosition();

  // the position editor can stack on top (margin remediation); Escape must close only the top modal
  const isUnderPositionEditor = Boolean(editingPosition);

  const handleClose = useMemo(
    () => () => {
      if (isUnderPositionEditor) {
        return;
      }

      setEditingOrderState(undefined);
    },
    [isUnderPositionEditor, setEditingOrderState]
  );

  const handleBack = useMemo(
    () => () => {
      setEditingOrderState({ orderKey: undefined, source: "OrdersModal" });
    },
    [setEditingOrderState]
  );

  if (!editingOrderState || !editingOrder) {
    return null;
  }

  const shouldShowBack = editingOrderState.source === "OrdersModal";

  return (
    <OrderEditor
      order={editingOrder}
      source={editingOrderState.source}
      onClose={handleClose}
      onBack={shouldShowBack ? handleBack : undefined}
    />
  );
}
