import { RootState } from '@/zustand/useAppStore';

export const selectShowDebugValues = (state: RootState) =>
  state.settings.showDebugValues;
export const selectSavedAllowedSlippage = (state: RootState) =>
  state.settings.savedAllowedSlippage;
export const selectExecutionFeeBufferBps = (state: RootState) =>
  state.settings.executionFeeBufferBps;
export const selectSavedAcceptablePriceImpactBuffer = (state: RootState) =>
  state.settings.savedAcceptablePriceImpactBuffer;
export const selectShouldUseExecutionFeeBuffer = (state: RootState) =>
  state.settings.shouldUseExecutionFeeBuffer;
export const selectIsPnlInLeverage = (state: RootState) =>
  state.settings.isPnlInLeverage;
export const selectShowPnlAfterFees = (state: RootState) =>
  state.settings.showPnlAfterFees;
export const selectShouldShowPositionLines = (state: RootState) =>
  state.settings.shouldShowPositionLines;
export const selectShouldDisableValidationForTesting = (state: RootState) =>
  state.settings.shouldDisableValidationForTesting;
export const selectSkipPreflight = (state: RootState) =>
  state.settings.skipPreflight;
export const selectIsLimitOrdersVisible = (state: RootState) =>
  state.settings.isLimitOrdersVisible;
export const selectIsTriggerWarningAccepted = (state: RootState) =>
  state.settings.isTriggerWarningAccepted;
export const selectIsTermsAccepted = (state: RootState) =>
  state.settings.isTermsAccepted;
export const selectComputeUnitMode = (state: RootState) =>
  state.settings.computeUnitMode;
export const selectRpcEndpointType = (state: RootState) =>
  state.settings.rpcEndpointType;
export const selectCustomRpcUrl = (state: RootState) =>
  state.settings.customRpcUrl;
export const selectCurrentRpcUrl = (state: RootState) =>
  state.settings.currentRpcUrl;
export const selectSetShowDebugValues = (state: RootState) =>
  state.settings.setShowDebugValues;
export const selectSetSavedAllowedSlippage = (state: RootState) =>
  state.settings.setSavedAllowedSlippage;
export const selectSetExecutionFeeBufferBps = (state: RootState) =>
  state.settings.setExecutionFeeBufferBps;
export const selectSetSavedAcceptablePriceImpactBuffer = (state: RootState) =>
  state.settings.setSavedAcceptablePriceImpactBuffer;
export const selectSetShouldUseExecutionFeeBuffer = (state: RootState) =>
  state.settings.setShouldUseExecutionFeeBuffer;
export const selectSetIsPnlInLeverage = (state: RootState) =>
  state.settings.setIsPnlInLeverage;
export const selectSetShowPnlAfterFees = (state: RootState) =>
  state.settings.setShowPnlAfterFees;
export const selectSetShouldShowPositionLines = (state: RootState) =>
  state.settings.setShouldShowPositionLines;
export const selectSetShouldDisableValidationForTesting = (state: RootState) =>
  state.settings.setShouldDisableValidationForTesting;
export const selectSetSkipPreflight = (state: RootState) =>
  state.settings.setSkipPreflight;
export const selectSetIsLimitOrdersVisible = (state: RootState) =>
  state.settings.setIsLimitOrdersVisible;
export const selectSetIsTriggerWarningAccepted = (state: RootState) =>
  state.settings.setIsTriggerWarningAccepted;
export const selectSetIsTermsAccepted = (state: RootState) =>
  state.settings.setIsTermsAccepted;
export const selectSetComputeUnitMode = (state: RootState) =>
  state.settings.setComputeUnitMode;
export const selectSetRpcEndpointType = (state: RootState) =>
  state.settings.setRpcEndpointType;
export const selectSetCustomRpcUrl = (state: RootState) =>
  state.settings.setCustomRpcUrl;
export const selectSetCurrentRpcUrl = (state: RootState) =>
  state.settings.setCurrentRpcUrl;
