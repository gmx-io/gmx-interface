import { useMemo, useState } from "react";

export type OrderEditorState = ReturnType<typeof useOrderEditorState>;

export function useOrderEditorState() {
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useState<string[]>([]);
  const [editingOrderKey, setEditingOrderKey] = useState<string>();
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  return useMemo(
    () => ({
      cancellingOrdersKeys,
      setCancellingOrdersKeys,
      editingOrderKey,
      setEditingOrderKey,
      sizeInputValue,
      setSizeInputValue,
      triggerPriceInputValue,
      setTriggerPriceInputValue,
      triggerRatioInputValue,
      setTriggerRatioInputValue,
    }),
    [cancellingOrdersKeys, editingOrderKey, sizeInputValue, triggerPriceInputValue, triggerRatioInputValue]
  );
}
