import { Operation } from '@/selectors/positionEditor/types';
import { SliceCreator } from '@/zustand/types';

interface PositionEditor {
  positionAddress?: string;
  selectedCollateralAddress?: string;
  collateralInputValue?: string;
  operation: Operation;
  setPositionAddress: (address?: string) => void;
  setSelectedCollateralAddress: (address?: string) => void;
  setCollateralInputValue: (value: string) => void;
  setOperation: (operation: Operation) => void;
}

export interface PositionEditorSlice {
  positionEditor: PositionEditor;
}

export const createPositionEditorSlice: SliceCreator<PositionEditorSlice> = (
  set
) => ({
  positionEditor: {
    positionAddress: undefined,
    selectedCollateralAddress: undefined,
    collateralInputValue: undefined,
    operation: Operation.Deposit,
    setPositionAddress: (address?: string) =>
      set((state) => ({
        positionEditor: {
          ...state.positionEditor,
          positionAddress: address,
        },
      })),
    setSelectedCollateralAddress: (address?: string) =>
      set((state) => ({
        positionEditor: {
          ...state.positionEditor,
          selectedCollateralAddress: address,
        },
      })),
    setCollateralInputValue: (value: string) =>
      set((state) => ({
        positionEditor: {
          ...state.positionEditor,
          collateralInputValue: value,
        },
      })),
    setOperation: (operation: Operation) =>
      set((state) => ({
        positionEditor: {
          ...state.positionEditor,
          operation,
        },
      })),
  },
});
