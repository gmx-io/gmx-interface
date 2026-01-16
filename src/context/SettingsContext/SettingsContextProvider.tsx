import noop from "lodash/noop";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

import { ARBITRUM, BOTANIX, getExecutionFeeConfig } from "config/chains";
import { isDevelopment } from "config/env";
import { DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import {
  BREAKDOWN_NET_PRICE_IMPACT_ENABLED_KEY,
  DEBUG_ERROR_BOUNDARY_KEY,
  DEBUG_SWAP_MARKETS_CONFIG_KEY,
  DISABLE_ORDER_VALIDATION_KEY,
  DISABLE_SHARE_MODAL_PNL_CHECK_KEY,
  EXTERNAL_SWAPS_ENABLED_KEY,
  IS_AUTO_CANCEL_TPSL_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  SETTINGS_WARNING_DOT_VISIBLE_KEY,
  SET_ACCEPTABLE_PRICE_IMPACT_ENABLED_KEY,
  SHOULD_SHOW_POSITION_LINES_KEY,
  SHOW_DEBUG_VALUES_KEY,
  SHOW_PNL_AFTER_FEES_KEY,
  TWAP_NUMBER_OF_PARTS_KEY,
  getAllowedSlippageKey,
  getExecutionFeeBufferBpsKey,
  getExpressOrdersEnabledKey,
  getGasPaymentTokenAddressKey,
  getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
  getLeverageEnabledKey as getLeverageSliderEnabledKey,
  getSyntheticsAcceptablePriceImpactBufferKey,
} from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { tenderlyLsKeys } from "lib/tenderly";
import useWallet from "lib/wallets/useWallet";
import { getDefaultGasPaymentToken } from "sdk/configs/express";
import { isValidTokenSafe } from "sdk/configs/tokens";
import { DEFAULT_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  isErrorBoundaryDebugEnabled: boolean;
  setIsErrorBoundaryDebugEnabled: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  savedAcceptablePriceImpactBuffer: number;
  setSavedAcceptablePriceImpactBuffer: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
  showPnlAfterFees: boolean;
  setShowPnlAfterFees: (val: boolean) => void;
  isPnlInLeverage: boolean;
  setIsPnlInLeverage: (val: boolean) => void;
  shouldDisableValidationForTesting: boolean;
  setShouldDisableValidationForTesting: (val: boolean) => void;
  shouldDisableShareModalPnlCheck: boolean;
  setShouldDisableShareModalPnlCheck: (val: boolean) => void;
  shouldShowPositionLines: boolean;
  setShouldShowPositionLines: (val: boolean) => void;
  isAutoCancelTPSL: boolean;
  setIsAutoCancelTPSL: (val: boolean) => void;
  isLeverageSliderEnabled: boolean;
  setIsLeverageSliderEnabled: (val: boolean) => void;

  tenderlyAccountSlug: string | undefined;
  setTenderlyAccountSlug: (val: string | undefined) => void;
  tenderlyProjectSlug: string | undefined;
  setTenderlyProjectSlug: (val: string | undefined) => void;
  tenderlyAccessKey: string | undefined;
  setTenderlyAccessKey: (val: string | undefined) => void;
  tenderlySimulationEnabled: boolean | undefined;
  setTenderlySimulationEnabled: (val: boolean | undefined) => void;

  breakdownNetPriceImpactEnabled: boolean;
  setBreakdownNetPriceImpactEnabled: (val: boolean) => void;

  isSettingsVisible: boolean;
  setIsSettingsVisible: (val: boolean) => void;

  expressOrdersEnabled: boolean;
  setExpressOrdersEnabled: (val: boolean) => void;

  gasPaymentTokenAddress: string;
  setGasPaymentTokenAddress: (val: string) => void;

  externalSwapsEnabled: boolean;
  setExternalSwapsEnabled: (val: boolean) => void;

  settingsWarningDotVisible: boolean;
  setSettingsWarningDotVisible: (val: boolean) => void;

  feedbackModalVisible: boolean;
  setFeedbackModalVisible: (val: boolean) => void;

  debugSwapMarketsConfig:
    | {
        disabledSwapMarkets?: string[];
        manualPath?: string[];
      }
    | undefined;
  setDebugSwapMarketsConfig: (val: { disabledSwapMarkets?: string[]; manualPath?: string[] }) => void;

  savedTwapNumberOfParts: number;
  setSavedTWAPNumberOfParts: (val: number) => void;

  isSetAcceptablePriceImpactEnabled: boolean;
  setIsSetAcceptablePriceImpactEnabled: (val: boolean) => void;
};

export const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext) as SettingsContextType;
}

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [showDebugValues, setShowDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const [isErrorBoundaryDebugEnabled, setIsErrorBoundaryDebugEnabled] = useLocalStorageSerializeKey(
    DEBUG_ERROR_BOUNDARY_KEY,
    false
  );
  const [savedAllowedSlippage, setSavedAllowedSlippage] = useLocalStorageSerializeKey(
    getAllowedSlippageKey(chainId),
    DEFAULT_SLIPPAGE_AMOUNT
  );

  const [savedAcceptablePriceImpactBuffer, setSavedAcceptablePriceImpactBuffer] = useLocalStorageSerializeKey(
    getSyntheticsAcceptablePriceImpactBufferKey(chainId),
    DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER
  );

  const [hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey, setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey] =
    useLocalStorageSerializeKey(getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(chainId), false);

  const [settingsWarningDotVisible, setSettingsWarningDotVisible] = useLocalStorageSerializeKey(
    SETTINGS_WARNING_DOT_VISIBLE_KEY,
    false
  );

  let [executionFeeBufferBps, setExecutionFeeBufferBps] = useLocalStorageSerializeKey(
    getExecutionFeeBufferBpsKey(chainId),
    getExecutionFeeConfig(chainId)?.defaultBufferBps
  );

  const shouldUseExecutionFeeBuffer = Boolean(getExecutionFeeConfig(chainId)?.defaultBufferBps);

  const [savedShowPnlAfterFees, setSavedShowPnlAfterFees] = useLocalStorageSerializeKey(
    [chainId, SHOW_PNL_AFTER_FEES_KEY],
    true
  );

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorageSerializeKey(
    [chainId, IS_PNL_IN_LEVERAGE_KEY],
    false
  );

  const [savedIsAutoCancelTPSL, setIsAutoCancelTPSL] = useLocalStorageSerializeKey(
    [chainId, IS_AUTO_CANCEL_TPSL_KEY],
    true
  );

  const [isLeverageSliderEnabled, setIsLeverageSliderEnabled] = useLocalStorageSerializeKey(
    getLeverageSliderEnabledKey(chainId),
    true
  );

  const [tenderlyAccountSlug, setTenderlyAccountSlug] = useLocalStorageSerializeKey(tenderlyLsKeys.accountSlug, "");
  const [tenderlyProjectSlug, setTenderlyProjectSlug] = useLocalStorageSerializeKey(tenderlyLsKeys.projectSlug, "");
  const [tenderlyAccessKey, setTenderlyAccessKey] = useLocalStorageSerializeKey(tenderlyLsKeys.accessKey, "");
  const [tenderlySimulationEnabled, setTenderlySimulationEnabled] = useLocalStorageSerializeKey(
    tenderlyLsKeys.enabled,
    false
  );

  const [externalSwapsEnabled, setExternalSwapsEnabled] = useLocalStorageByChainId(
    chainId,
    EXTERNAL_SWAPS_ENABLED_KEY,
    true
  );
  const [debugSwapMarketsConfig, setDebugSwapMarketsConfig] = useLocalStorageSerializeKey<
    undefined | { disabledSwapMarkets?: string[]; manualPath?: string[] }
  >([chainId, DEBUG_SWAP_MARKETS_CONFIG_KEY], undefined);

  const [expressOrdersEnabled, setExpressOrdersEnabled] = useLocalStorageSerializeKey(
    getExpressOrdersEnabledKey(chainId, account),
    false
  );

  const [savedBreakdownNetPriceImpactEnabled, setSavedBreakdownNetPriceImpactEnabled] = useLocalStorageSerializeKey(
    [chainId, BREAKDOWN_NET_PRICE_IMPACT_ENABLED_KEY],
    false
  );

  const [savedSetAcceptablePriceImpactEnabled, setSavedSetAcceptablePriceImpactEnabled] = useLocalStorageSerializeKey(
    [chainId, SET_ACCEPTABLE_PRICE_IMPACT_ENABLED_KEY],
    false
  );

  let [gasPaymentTokenAddress, setGasPaymentTokenAddress] = useLocalStorageSerializeKey(
    getGasPaymentTokenAddressKey(chainId, account),
    getDefaultGasPaymentToken(chainId)
  );
  // Reason: useLocalStorageSerializeKey leaks previous value to the next render even if key is changed
  if (gasPaymentTokenAddress && !isValidTokenSafe(chainId, gasPaymentTokenAddress)) {
    gasPaymentTokenAddress = getDefaultGasPaymentToken(chainId);
  }

  let [savedShouldDisableValidationForTesting, setSavedShouldDisableValidationForTesting] = useLocalStorageSerializeKey(
    [chainId, DISABLE_ORDER_VALIDATION_KEY],
    false
  );
  if (!isDevelopment()) {
    savedShouldDisableValidationForTesting = false;
    setSavedShouldDisableValidationForTesting = noop;
  }

  let [savedShouldDisableShareModalPnlCheck, setSavedShouldDisableShareModalPnlCheck] = useLocalStorageSerializeKey(
    [chainId, DISABLE_SHARE_MODAL_PNL_CHECK_KEY],
    false
  );
  if (!isDevelopment()) {
    savedShouldDisableShareModalPnlCheck = false;
    setSavedShouldDisableShareModalPnlCheck = noop;
  }

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [chainId, SHOULD_SHOW_POSITION_LINES_KEY],
    true
  );

  const [savedTwapNumberOfParts, setSavedTWAPNumberOfParts] = useLocalStorageSerializeKey(
    [chainId, TWAP_NUMBER_OF_PARTS_KEY],
    DEFAULT_TWAP_NUMBER_OF_PARTS
  );

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  useEffect(() => {
    if (shouldUseExecutionFeeBuffer && executionFeeBufferBps === undefined) {
      setExecutionFeeBufferBps(getExecutionFeeConfig(chainId)?.defaultBufferBps ?? 0);
    }
  }, [chainId, executionFeeBufferBps, setExecutionFeeBufferBps, shouldUseExecutionFeeBuffer]);

  useEffect(() => {
    if (!hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey && chainId === ARBITRUM) {
      setExecutionFeeBufferBps(getExecutionFeeConfig(chainId)?.defaultBufferBps ?? 0);
      setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(true);
    }
  }, [
    chainId,
    hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
    setExecutionFeeBufferBps,
    setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
  ]);

  useEffect(
    function fallbackMultichain() {
      if (srcChainId && !expressOrdersEnabled) {
        setExpressOrdersEnabled(true);
      }
    },
    [expressOrdersEnabled, setExpressOrdersEnabled, srcChainId]
  );

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      isErrorBoundaryDebugEnabled: isDevelopment() ? isErrorBoundaryDebugEnabled! : false,
      setIsErrorBoundaryDebugEnabled,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
      executionFeeBufferBps,
      setExecutionFeeBufferBps,
      shouldUseExecutionFeeBuffer,
      savedAcceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer!,
      setSavedAcceptablePriceImpactBuffer,
      showPnlAfterFees: savedShowPnlAfterFees!,
      setShowPnlAfterFees: setSavedShowPnlAfterFees,
      isPnlInLeverage: savedIsPnlInLeverage!,
      setIsPnlInLeverage: setSavedIsPnlInLeverage,
      shouldDisableValidationForTesting: savedShouldDisableValidationForTesting!,
      setShouldDisableValidationForTesting: setSavedShouldDisableValidationForTesting,
      shouldDisableShareModalPnlCheck: savedShouldDisableShareModalPnlCheck!,
      setShouldDisableShareModalPnlCheck: setSavedShouldDisableShareModalPnlCheck,
      shouldShowPositionLines: savedShouldShowPositionLines!,
      setShouldShowPositionLines: setSavedShouldShowPositionLines,
      isAutoCancelTPSL: savedIsAutoCancelTPSL!,
      setIsAutoCancelTPSL: setIsAutoCancelTPSL,
      isLeverageSliderEnabled: isLeverageSliderEnabled!,
      setIsLeverageSliderEnabled: setIsLeverageSliderEnabled,

      breakdownNetPriceImpactEnabled: savedBreakdownNetPriceImpactEnabled!,
      setBreakdownNetPriceImpactEnabled: setSavedBreakdownNetPriceImpactEnabled,

      isSetAcceptablePriceImpactEnabled: savedSetAcceptablePriceImpactEnabled!,
      setIsSetAcceptablePriceImpactEnabled: setSavedSetAcceptablePriceImpactEnabled,

      setTenderlyAccessKey,
      setTenderlyAccountSlug,
      setTenderlyProjectSlug,
      setTenderlySimulationEnabled,
      tenderlyAccessKey,
      tenderlyAccountSlug,
      tenderlyProjectSlug,
      tenderlySimulationEnabled,

      isSettingsVisible,
      setIsSettingsVisible,

      expressOrdersEnabled: expressOrdersEnabled!,
      setExpressOrdersEnabled,
      gasPaymentTokenAddress: gasPaymentTokenAddress!,
      setGasPaymentTokenAddress,

      // External swaps are enabled by default on Botanix
      externalSwapsEnabled: chainId === BOTANIX || externalSwapsEnabled!,
      setExternalSwapsEnabled,

      debugSwapMarketsConfig: debugSwapMarketsConfig!,
      setDebugSwapMarketsConfig,

      settingsWarningDotVisible: settingsWarningDotVisible!,
      setSettingsWarningDotVisible,

      savedTwapNumberOfParts: savedTwapNumberOfParts!,
      setSavedTWAPNumberOfParts,

      feedbackModalVisible,
      setFeedbackModalVisible,
    };
  }, [
    showDebugValues,
    setShowDebugValues,
    isErrorBoundaryDebugEnabled,
    setIsErrorBoundaryDebugEnabled,
    savedAllowedSlippage,
    setSavedAllowedSlippage,
    executionFeeBufferBps,
    setExecutionFeeBufferBps,
    shouldUseExecutionFeeBuffer,
    savedAcceptablePriceImpactBuffer,
    setSavedAcceptablePriceImpactBuffer,
    savedShowPnlAfterFees,
    setSavedShowPnlAfterFees,
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedShouldDisableValidationForTesting,
    setSavedShouldDisableValidationForTesting,
    savedShouldDisableShareModalPnlCheck,
    setSavedShouldDisableShareModalPnlCheck,
    savedShouldShowPositionLines,
    setSavedShouldShowPositionLines,
    savedIsAutoCancelTPSL,
    setIsAutoCancelTPSL,
    isLeverageSliderEnabled,
    setIsLeverageSliderEnabled,
    savedBreakdownNetPriceImpactEnabled,
    setSavedBreakdownNetPriceImpactEnabled,
    savedSetAcceptablePriceImpactEnabled,
    setSavedSetAcceptablePriceImpactEnabled,
    setTenderlyAccessKey,
    setTenderlyAccountSlug,
    setTenderlyProjectSlug,
    setTenderlySimulationEnabled,
    tenderlyAccessKey,
    tenderlyAccountSlug,
    tenderlyProjectSlug,
    tenderlySimulationEnabled,
    isSettingsVisible,
    expressOrdersEnabled,
    setExpressOrdersEnabled,
    gasPaymentTokenAddress,
    setGasPaymentTokenAddress,
    chainId,
    externalSwapsEnabled,
    setExternalSwapsEnabled,
    debugSwapMarketsConfig,
    setDebugSwapMarketsConfig,
    settingsWarningDotVisible,
    setSettingsWarningDotVisible,
    savedTwapNumberOfParts,
    setSavedTWAPNumberOfParts,
    feedbackModalVisible,
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
