import { RootState } from '@/zustand/useAppStore';

export const selectGmboxSelectedMarketTokenOrGLvTokenAddress = (
  state: RootState
) => state.gmbox.selectedMarketTokenOrGLvTokenAddress;
export const selectGmboxSelectedMarketTokenAddressForGlv = (state: RootState) =>
  state.gmbox.selectedMarketTokenAddressForGlv;

export const selectGmboxToMarketTokenAddressForShift = (state: RootState) =>
  state.gmbox.toMarketTokenAddressForShift;
export const selectGmboxToGLvTokenAddressForShift = (state: RootState) =>
  state.gmbox.toGLvTokenAddressForShift;

export const selectGmboxFirstTokenAddress = (state: RootState) =>
  state.gmbox.firstTokenAddress;
export const selectGmboxSecondTokenAddress = (state: RootState) =>
  state.gmbox.secondTokenAddress;

export const selectGmboxFirstInputValue = (state: RootState) =>
  state.gmbox.firstTokenInputValue;
export const selectGmboxSecondInputValue = (state: RootState) =>
  state.gmbox.secondTokenInputValue;
export const selectGmboxMarketOrGLvTokenInputValue = (state: RootState) =>
  state.gmbox.marketOrGLvTokenInputValue;

export const selectGmboxFromTokenInputValueForShift = (state: RootState) =>
  state.gmbox.fromTokenInputValueForShift;
export const selectGmboxToTokenInputValueForShift = (state: RootState) =>
  state.gmbox.toTokenInputValueForShift;

export const selectGmboxFocusedInput = (state: RootState) =>
  state.gmbox.focusedInput;
export const selectGmboxFocusedInputForShift = (state: RootState) =>
  state.gmbox.focusedInputForShift;

export const selectGmboxStage = (state: RootState) => state.gmbox.stage;
export const selectGmboxOperation = (state: RootState) => state.gmbox.operation;
export const selectGmboxMode = (state: RootState) => state.gmbox.mode;

export const selectGmboxIsMarketForGlvSelectedManually = (state: RootState) =>
  state.gmbox.isMarketForGlvSelectedManually;

export const selectSetGmboxSelectedMarketTokenOrGLvTokenAddress = (
  state: RootState
) => state.gmbox.setSelectedMarketTokenOrGLvTokenAddress;
export const selectSetGmboxSelectedMarketTokenAddressForGlv = (
  state: RootState
) => state.gmbox.setSelectedMarketTokenAddressForGlv;

export const selectSetGmboxToMarketTokenAddressForShift = (state: RootState) =>
  state.gmbox.setToMarketTokenAddressForShift;
export const selectSetGmboxToGLvTokenAddressForShift = (state: RootState) =>
  state.gmbox.setToGLvTokenAddressForShift;

export const selectSetGmboxFirstTokenAddress = (state: RootState) =>
  state.gmbox.setFirstTokenAddress;
export const selectSetGmboxSecondTokenAddress = (state: RootState) =>
  state.gmbox.setSecondTokenAddress;

export const selectSetGmboxFirstInputValue = (state: RootState) =>
  state.gmbox.setFirstTokenInputValue;
export const selectSetGmboxSecondInputValue = (state: RootState) =>
  state.gmbox.setSecondTokenInputValue;
export const selectSetGmboxMarketOrGLvTokenInputValue = (state: RootState) =>
  state.gmbox.setMarketOrGLvTokenInputValue;

export const selectSetGmboxFromTokenInputValueForShift = (state: RootState) =>
  state.gmbox.setFromTokenInputValueForShift;
export const selectSetGmboxToTokenInputValueForShift = (state: RootState) =>
  state.gmbox.setToTokenInputValueForShift;

export const selectResetGmboxInput = (state: RootState) =>
  state.gmbox.resetInput;
export const selectResetGmboxInputForShift = (state: RootState) =>
  state.gmbox.resetInputForShift;

export const selectSetGmboxStage = (state: RootState) => state.gmbox.setStage;
export const selectSetGmboxFocusedInput = (state: RootState) =>
  state.gmbox.setFocusedInput;
export const selectSetGmboxFocusedInputForShift = (state: RootState) =>
  state.gmbox.setFocusedInputForShift;

export const selectSetGmboxOperation = (state: RootState) =>
  state.gmbox.setOperation;
export const selectSetGmboxMode = (state: RootState) => state.gmbox.setMode;

export const selectSetGmboxIsMarketForGlvSelectedManually = (
  state: RootState
) => state.gmbox.setIsMarketForGlvSelectedManually;
