import {
  selectCancellingOrdersKeys,
  selectEditingOrderState,
  selectSetCancellingOrdersKeys,
  selectSetEditingOrderState,
  selectOrderEditorSetSizeInputValue,
  selectOrderEditorSetTriggerPriceInputValue,
  selectOrderEditorSetTriggerRatioInputValue,
  selectOrderEditorSizeInputValue,
  selectOrderEditorTriggerPriceInputValue,
  selectOrderEditorTriggerRatioInputValue,
  selectOrderEditorIsSubmitting,
  selectOrderEditorSetIsSubmitting,
} from "../selectors/orderEditorSelectors";
import { useSelector } from "../utils";

export const useCancellingOrdersKeysState = () => {
  const cancellingOrdersKeys = useSelector(selectCancellingOrdersKeys);
  const setCancellingOrdersKeys = useSelector(selectSetCancellingOrdersKeys);
  return [cancellingOrdersKeys, setCancellingOrdersKeys] as const;
};

export const useEditingOrderState = () => {
  const editingOrderState = useSelector(selectEditingOrderState);
  const setEditingOrderState = useSelector(selectSetEditingOrderState);
  return [editingOrderState, setEditingOrderState] as const;
};

export const useOrderEditorIsSubmittingState = () => {
  const isSubmitting = useSelector(selectOrderEditorIsSubmitting);
  const setIsSubmitting = useSelector(selectOrderEditorSetIsSubmitting);
  return [isSubmitting, setIsSubmitting] as const;
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
