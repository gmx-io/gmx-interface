import {
  selectCancellingOrdersKeys,
  selectEditingOrderKey,
  selectSetCancellingOrdersKeys,
  selectSetEditingOrderKey,
  selectOrderEditorSetSizeInputValue,
  selectOrderEditorSetTriggerPriceInputValue,
  selectOrderEditorSetTriggerRatioInputValue,
  selectOrderEditorSizeInputValue,
  selectOrderEditorTriggerPriceInputValue,
  selectOrderEditorTriggerRatioInputValue,
} from "../selectors/orderEditorSelectors";
import { useSelector } from "../utils";

export const useCancellingOrdersKeysState = () => {
  const cancellingOrdersKeys = useSelector(selectCancellingOrdersKeys);
  const setCancellingOrdersKeys = useSelector(selectSetCancellingOrdersKeys);
  return [cancellingOrdersKeys, setCancellingOrdersKeys] as const;
};

export const useEditingOrderKeyState = () => {
  const editingOrderKey = useSelector(selectEditingOrderKey);
  const setEditingOrderKey = useSelector(selectSetEditingOrderKey);
  return [editingOrderKey, setEditingOrderKey] as const;
};

export const useOrderEditorSizeInputValueState = () => {
  const sizeInputValue = useSelector(selectOrderEditorSizeInputValue);
  const setSizeInputValue = useSelector(selectOrderEditorSetSizeInputValue);
  return [sizeInputValue, setSizeInputValue] as const;
};

export const useOrderEditorTriggerPriceInputValueState = () => {
  const triggerPriceInputValue = useSelector(selectOrderEditorTriggerPriceInputValue);
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  return [triggerPriceInputValue, setTriggerPriceInputValue] as const;
};

export const useOrderEditorTriggerRatioInputValueState = () => {
  const triggerRatioInputValue = useSelector(selectOrderEditorTriggerRatioInputValue);
  const setTriggerRatioInputValue = useSelector(selectOrderEditorSetTriggerRatioInputValue);
  return [triggerRatioInputValue, setTriggerRatioInputValue] as const;
};
