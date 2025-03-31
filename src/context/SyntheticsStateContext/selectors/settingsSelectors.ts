import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectIsSettingsVisible = (s: SyntheticsState) => s.settings.isSettingsVisible;
export const selectSetIsSettingsVisible = (s: SyntheticsState) => s.settings.setIsSettingsVisible;
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
export const selectIsLeverageSliderEnabled = (s: SyntheticsState) => s.settings.isLeverageSliderEnabled;
export const selectOneClickTradingEnabled = (s: SyntheticsState) => s.settings.oneClickTradingEnabled;
export const selectSetOneClickTradingEnabled = (s: SyntheticsState) => s.settings.setOneClickTradingEnabled;
export const selectExpressOrdersEnabled = (s: SyntheticsState) => s.settings.expressOrdersEnabled;
export const selectSetExpressOrdersEnabled = (s: SyntheticsState) => s.settings.setExpressOrdersEnabled;
export const selectDebugSwapMarketsConfig = (s: SyntheticsState) => s.settings.debugSwapMarketsConfig;
export const selectSetDebugSwapMarketsConfig = (s: SyntheticsState) => s.settings.setDebugSwapMarketsConfig;
