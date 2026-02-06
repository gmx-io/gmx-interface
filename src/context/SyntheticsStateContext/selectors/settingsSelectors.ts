import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectShowDebugValues = (s: SyntheticsState) => s.settings.showDebugValues;
export const selectSavedAllowedSlippage = (s: SyntheticsState) => s.settings.savedAllowedSlippage;
export const selectExecutionFeeBufferBps = (s: SyntheticsState) => s.settings.executionFeeBufferBps;
export const selectSavedAcceptablePriceImpactBuffer = (s: SyntheticsState) =>
  s.settings.savedAcceptablePriceImpactBuffer;
export const selectIsPnlInLeverage = (s: SyntheticsState) => s.settings.isPnlInLeverage;
export const selectShowPnlAfterFees = (s: SyntheticsState) => s.settings.showPnlAfterFees;
export const selectIsLeverageSliderEnabled = (s: SyntheticsState) => s.settings.isLeverageSliderEnabled;
export const selectExpressOrdersEnabled = (s: SyntheticsState) => s.settings.expressOrdersEnabled;
export const selectSetExpressOrdersEnabled = (s: SyntheticsState) => s.settings.setExpressOrdersEnabled;
export const selectGasPaymentTokenAddress = (s: SyntheticsState) => s.settings.gasPaymentTokenAddress;
export const selectSetGasPaymentTokenAddress = (s: SyntheticsState) => s.settings.setGasPaymentTokenAddress;
export const selectDebugSwapMarketsConfig = (s: SyntheticsState) => s.settings.debugSwapMarketsConfig;
export const selectSetDebugSwapMarketsConfig = (s: SyntheticsState) => s.settings.setDebugSwapMarketsConfig;
export const selectSettingsWarningDotVisible = (s: SyntheticsState) => s.settings.settingsWarningDotVisible;
export const selectBreakdownNetPriceImpactEnabled = (s: SyntheticsState) => s.settings.breakdownNetPriceImpactEnabled;
export const selectIsSetAcceptablePriceImpactEnabled = (s: SyntheticsState) =>
  s.settings.isSetAcceptablePriceImpactEnabled;
