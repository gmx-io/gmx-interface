import { RootState } from '@/zustand/useAppStore';

export const selectPositionEditorEditingPositionAddress = (state: RootState) =>
  state.positionEditor.positionAddress;
export const selectPositionEditorSelectedCollateralAddress = (
  state: RootState
) => state.positionEditor.selectedCollateralAddress;
export const selectPositionEditorCollateralInputValue = (state: RootState) =>
  state.positionEditor.collateralInputValue;
export const selectPositionEditorOperation = (state: RootState) =>
  state.positionEditor.operation;
export const selectPositionEditorSetPositionAddress = (state: RootState) =>
  state.positionEditor.setPositionAddress;
export const selectPositionEditorSetSelectedCollateralAddress = (
  state: RootState
) => state.positionEditor.setSelectedCollateralAddress;
export const selectPositionEditorSetCollateralInputValue = (state: RootState) =>
  state.positionEditor.setCollateralInputValue;
export const selectPositionEditorSetOperation = (state: RootState) =>
  state.positionEditor.setOperation;
