import { RootState } from '@/zustand/useAppStore';

export const selectTradeboxFromTokenInputValue = (state: RootState) =>
  state.tradebox.inputs.fromTokenValue;
export const selectTradeboxToTokenInputValue = (state: RootState) =>
  state.tradebox.inputs.toTokenValue;
export const selectTradeboxTriggerRatioInputValue = (state: RootState) =>
  state.tradebox.inputs.triggerRatioValue;
export const selectTradeboxTriggerPriceInputValue = (state: RootState) =>
  state.tradebox.inputs.triggerPriceValue;
export const selectTradeboxCloseSizeInputValue = (state: RootState) =>
  state.tradebox.inputs.closeSizeValue;
export const selectTradeboxStage = (state: RootState) =>
  state.tradebox.ui.stage;
export const selectTradeboxFocusedInput = (state: RootState) =>
  state.tradebox.ui.focusedInput;
export const selectTradeboxTradeOptions = (state: RootState) =>
  state.tradebox.options;
export const selectTradeboxChainId = (state: RootState) =>
  state.tradebox.options.chainId;
export const selectTradeboxTradeType = (state: RootState) =>
  state.tradebox.options.tradeType;
export const selectTradeboxTradeMode = (state: RootState) =>
  state.tradebox.options.tradeMode;
export const selectTradeboxTradeLeverage = (state: RootState) =>
  state.tradebox.options.leverage;
export const selectTradeboxIsLeverageEnabled = (state: RootState) =>
  state.tradebox.settings.isLeverageEnabled;
export const selectTradeboxKeepLeverage = (state: RootState) =>
  state.tradebox.settings.keepLeverage;
export const selectTradeboxAdvancedOptions = (state: RootState) =>
  state.tradebox.settings.advancedOptions;
export const selectTradeboxDefaultTriggerAcceptablePriceImpactBps = (
  state: RootState
) => state.tradebox.settings.defaultTriggerAcceptablePriceImpactBps;
export const selectTradeboxSelectedTriggerAcceptablePriceImpactBps = (
  state: RootState
) => state.tradebox.settings.selectedTriggerAcceptablePriceImpactBps;

export const selectSetTradeboxFromTokenInputValue = (state: RootState) =>
  state.tradebox.setFromTokenInputValue;
export const selectSetTradeboxToTokenInputValue = (state: RootState) =>
  state.tradebox.setToTokenInputValue;
export const selectSetTradeboxTriggerRatioInputValue = (state: RootState) =>
  state.tradebox.setTriggerRatioInputValue;
export const selectSetTradeboxTriggerPriceInputValue = (state: RootState) =>
  state.tradebox.setTriggerPriceInputValue;
export const selectSetTradeboxCloseSizeInputValue = (state: RootState) =>
  state.tradebox.setCloseSizeInputValue;
export const selectResetTradeboxInputs = (state: RootState) =>
  state.tradebox.resetInputs;
export const selectSetTradeboxStage = (state: RootState) =>
  state.tradebox.setStage;
export const selectSetTradeboxFocusedInput = (state: RootState) =>
  state.tradebox.setFocusedInput;
export const selectResetTradeOptions = (state: RootState) =>
  state.tradebox.resetOptions;
export const selectDirectSetTradeOptions = (state: RootState) =>
  state.tradebox.directSetOptions;
export const selectSetTradeboxChainId = (state: RootState) =>
  state.tradebox.setChainId;
export const selectSetTradeboxTradeType = (state: RootState) =>
  state.tradebox.setTradeType;
export const selectSetTradeboxTradeMode = (state: RootState) =>
  state.tradebox.setTradeMode;
export const selectSetTradeboxTradeLeverage = (state: RootState) =>
  state.tradebox.setLeverage;
export const selectSetTradeboxTradeParams = (state: RootState) =>
  state.tradebox.setTradeParams;
export const selectSetTradeboxMarketTokenAddress = (state: RootState) =>
  state.tradebox.setMarketTokenAddress;
export const selectSetTradeboxFromTokenAddress = (state: RootState) =>
  state.tradebox.setFromTokenAddress;
export const selectSetTradeboxToTokenAddress = (state: RootState) =>
  state.tradebox.setToTokenAddress;
export const selectSetTradeboxCollateralTokenAddress = (state: RootState) =>
  state.tradebox.setCollateralTokenAddress;
export const selectSetTradeboxReceiveTokenAddress = (state: RootState) =>
  state.tradebox.setReceiveTokenAddress;
export const selectTradeboxSwitchTokenAddresses = (state: RootState) =>
  state.tradebox.switchTokenAddresses;
export const selectSetTradeboxIsLeverageEnabled = (state: RootState) =>
  state.tradebox.setIsLeverageEnabled;
export const selectSetTradeboxKeepLeverage = (state: RootState) =>
  state.tradebox.setKeepLeverage;
export const selectSetTradeboxAdvancedOptions = (state: RootState) =>
  state.tradebox.setAdvancedOptions;
export const selectSetTradeboxDefaultTriggerAcceptablePriceImpactBps = (
  state: RootState
) => state.tradebox.setDefaultTriggerAcceptablePriceImpactBps;
export const selectSetTradeboxSelectedTriggerAcceptablePriceImpactBps = (
  state: RootState
) => state.tradebox.setSelectedTriggerAcceptablePriceImpactBps;
