import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";

export const selectShowDebugValues = (s: SyntheticsTradeState) => s.settings.showDebugValues;
export const selectSetShowDebugValues = (s: SyntheticsTradeState) => s.settings.setShowDebugValues;
export const selectSavedAllowedSlippage = (s: SyntheticsTradeState) => s.settings.savedAllowedSlippage;
export const selectExecutionFeeBufferBps = (s: SyntheticsTradeState) => s.settings.executionFeeBufferBps;
export const selectSetExecutionFeeBufferBps = (s: SyntheticsTradeState) => s.settings.setExecutionFeeBufferBps;
export const selectSetSavedAllowedSlippage = (s: SyntheticsTradeState) => s.settings.setSavedAllowedSlippage;
export const selectSavedAcceptablePriceImpactBuffer = (s: SyntheticsTradeState) =>
  s.settings.savedAcceptablePriceImpactBuffer;
export const selectSetSavedAcceptablePriceImpactBuffer = (s: SyntheticsTradeState) =>
  s.settings.setSavedAcceptablePriceImpactBuffer;
export const selectShouldUseExecutionFeeBuffer = (s: SyntheticsTradeState) => s.settings.shouldUseExecutionFeeBuffer;
export const selectOracleKeeperInstancesConfig = (s: SyntheticsTradeState) => s.settings.oracleKeeperInstancesConfig;
export const selectSetOracleKeeperInstancesConfig = (s: SyntheticsTradeState) =>
  s.settings.setOracleKeeperInstancesConfig;
