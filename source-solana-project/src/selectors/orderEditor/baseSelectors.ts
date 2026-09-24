import { RootState } from '@/zustand/useAppStore';

export const selectOrderEditorCancellingOrdersAddresses = (state: RootState) =>
  state.orderEditor.cancellingOrdersAddresses;
export const selectOrderEditorEditingOrderAddress = (state: RootState) =>
  state.orderEditor.editingOrderAddress;
export const selectOrderEditorSizeInputValue = (state: RootState) =>
  state.orderEditor.sizeInputValue;
export const selectOrderEditorTriggerPriceInputValue = (state: RootState) =>
  state.orderEditor.triggerPriceInputValue;
export const selectOrderEditorTriggerRatioInputValue = (state: RootState) =>
  state.orderEditor.triggerRatioInputValue;
export const selectOrderEditorInitialAcceptablePriceImpactBps = (
  state: RootState
) => state.orderEditor.initialAcceptablePriceImpactBps;
export const selectOrderEditorAcceptablePriceImpactBps = (state: RootState) =>
  state.orderEditor.acceptablePriceImpactBps;
export const selectSetOrderEditorCancellingOrdersAddresses = (
  state: RootState
) => state.orderEditor.setCancellingOrdersAddresses;
export const selectSetOrderEditorEditingOrderAddress = (state: RootState) =>
  state.orderEditor.setEditingOrderAddress;
export const selectSetOrderEditorSizeInputValue = (state: RootState) =>
  state.orderEditor.setSizeInputValue;
export const selectSetOrderEditorTriggerPriceInputValue = (state: RootState) =>
  state.orderEditor.setTriggerPriceInputValue;
export const selectSetOrderEditorTriggerRatioInputValue = (state: RootState) =>
  state.orderEditor.setTriggerRatioInputValue;
export const selectSetOrderEditorAcceptablePriceImpactBps = (
  state: RootState
) => state.orderEditor.setAcceptablePriceImpactBps;
export const selectResetOrderEditorState = (state: RootState) =>
  state.orderEditor.resetState;
