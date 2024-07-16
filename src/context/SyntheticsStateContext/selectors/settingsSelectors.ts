import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectShowDebugValues = (s: SyntheticsState) => s.settings.showDebugValues;
export const selectSetShowDebugValues = (s: SyntheticsState) => s.settings.setShowDebugValues;
export const selectSavedAllowedSlippage = (s: SyntheticsState) => s.settings.savedAllowedSlippage;
export const selectExecutionFeeBufferBps = (s: SyntheticsState) => s.settings.executionFeeBufferBps;
export const selectSetExecutionFeeBufferBps = (s: SyntheticsState) => s.settings.setExecutionFeeBufferBps;
export const selectSetSavedAllowedSlippage = (s: SyntheticsState) => s.settings.setSavedAllowedSlippage;
export const selectSavedAcceptablePriceImpactBuffer = (s: SyntheticsState) =>
  s.settings.savedAcceptablePriceImpactBuffer;
export const selectSetSavedAcceptablePriceImpactBuffer = (s: SyntheticsState) =>
  s.settings.setSavedAcceptablePriceImpactBuffer;
export const selectShouldUseExecutionFeeBuffer = (s: SyntheticsState) => s.settings.shouldUseExecutionFeeBuffer;
export const selectOracleKeeperInstancesConfig = (s: SyntheticsState) => s.settings.oracleKeeperInstancesConfig;
export const selectSetOracleKeeperInstancesConfig = (s: SyntheticsState) => s.settings.setOracleKeeperInstancesConfig;
export const selectIsPnlInLeverage = (s: SyntheticsState) => s.settings.isPnlInLeverage;
export const selectShowPnlAfterFees = (s: SyntheticsState) => s.settings.showPnlAfterFees;
