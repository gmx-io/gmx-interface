import noop from "lodash/noop";
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from "react";

import { ARBITRUM, BOTANIX, EXECUTION_FEE_CONFIG_V2, SUPPORTED_CHAIN_IDS } from "config/chains";
import { isDevelopment } from "config/env";
import { DEFAULT_ACCEPTABLE_PRICE_IMPACT_BUFFER, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import {
  DEBUG_SWAP_MARKETS_CONFIG_KEY,
  DISABLE_ORDER_VALIDATION_KEY,
  EXTERNAL_SWAPS_ENABLED_KEY,
  IS_AUTO_CANCEL_TPSL_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
  SETTINGS_WARNING_DOT_VISIBLE_KEY,
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
import { getOracleKeeperRandomIndex } from "sdk/configs/oracleKeeper";
import { DEFAULT_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  savedAcceptablePriceImpactBuffer: number;
  setSavedAcceptablePriceImpactBuffer: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
  oracleKeeperInstancesConfig: { [chainId: number]: number };
  setOracleKeeperInstancesConfig: Dispatch<SetStateAction<{ [chainId: number]: number } | undefined>>;
  showPnlAfterFees: boolean;
  setShowPnlAfterFees: (val: boolean) => void;
  isPnlInLeverage: boolean;
  setIsPnlInLeverage: (val: boolean) => void;
  shouldDisableValidationForTesting: boolean;
  setShouldDisableValidationForTesting: (val: boolean) => void;
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

  debugSwapMarketsConfig:
    | {
        disabledSwapMarkets?: string[];
        manualPath?: string[];
      }
    | undefined;
  setDebugSwapMarketsConfig: (val: { disabledSwapMarkets?: string[]; manualPath?: string[] }) => void;

  savedTwapNumberOfParts: number;
  setSavedTWAPNumberOfParts: (val: number) => void;
};

export const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext) as SettingsContextType;
}

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [showDebugValues, setShowDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const [savedAllowedSlippage, setSavedAllowedSlippage] = useLocalStorageSerializeKey(
    getAllowedSlippageKey(chainId),
    DEFAULT_SLIPPAGE_AMOUNT
  );

  const isBotanix = chainId === BOTANIX;

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
    EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps
  );
  const shouldUseExecutionFeeBuffer = Boolean(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);

  const [oracleKeeperInstancesConfig, setOracleKeeperInstancesConfig] = useLocalStorageSerializeKey(
    ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
    SUPPORTED_CHAIN_IDS.reduce(
      (acc, chainId) => {
        acc[chainId] = getOracleKeeperRandomIndex(chainId);
        return acc;
      },
      {} as { [chainId: number]: number }
    )
  );

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
    false
  );
  const [debugSwapMarketsConfig, setDebugSwapMarketsConfig] = useLocalStorageSerializeKey<
    undefined | { disabledSwapMarkets?: string[]; manualPath?: string[] }
  >([chainId, DEBUG_SWAP_MARKETS_CONFIG_KEY], undefined);

  const [expressOrdersEnabled, setExpressOrdersEnabled] = useLocalStorageSerializeKey(
    getExpressOrdersEnabledKey(chainId, account),
    false
  );

  const [gasPaymentTokenAddress, setGasPaymentTokenAddress] = useLocalStorageSerializeKey(
    getGasPaymentTokenAddressKey(chainId, account),
    getDefaultGasPaymentToken(chainId)
  );

  let savedShouldDisableValidationForTesting: boolean | undefined;
  let setSavedShouldDisableValidationForTesting: (val: boolean) => void;
  if (isDevelopment()) {
    // Safety: isDevelopment never changes
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [savedShouldDisableValidationForTesting, setSavedShouldDisableValidationForTesting] = useLocalStorageSerializeKey(
      [chainId, DISABLE_ORDER_VALIDATION_KEY],
      false
    );
  } else {
    savedShouldDisableValidationForTesting = false;
    setSavedShouldDisableValidationForTesting = noop;
  }

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [chainId, SHOULD_SHOW_POSITION_LINES_KEY],
    true
  );

  const [savedTwapNumberOfParts, setSavedTWAPNumberOfParts] = useLocalStorageSerializeKey(
    [chainId, TWAP_NUMBER_OF_PARTS_KEY],
    DEFAULT_TWAP_NUMBER_OF_PARTS
  );

  useEffect(() => {
    if (shouldUseExecutionFeeBuffer && executionFeeBufferBps === undefined) {
      setExecutionFeeBufferBps(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);
    }
  }, [chainId, executionFeeBufferBps, setExecutionFeeBufferBps, shouldUseExecutionFeeBuffer]);

  useEffect(() => {
    if (!hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey && chainId === ARBITRUM) {
      setExecutionFeeBufferBps(EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps);
      setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(true);
    }
  }, [
    chainId,
    hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
    setExecutionFeeBufferBps,
    setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
  ]);

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
      executionFeeBufferBps,
      setExecutionFeeBufferBps,
      shouldUseExecutionFeeBuffer,
      oracleKeeperInstancesConfig: oracleKeeperInstancesConfig!,
      setOracleKeeperInstancesConfig,
      savedAcceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer!,
      setSavedAcceptablePriceImpactBuffer,
      showPnlAfterFees: savedShowPnlAfterFees!,
      setShowPnlAfterFees: setSavedShowPnlAfterFees,
      isPnlInLeverage: savedIsPnlInLeverage!,
      setIsPnlInLeverage: setSavedIsPnlInLeverage,
      shouldDisableValidationForTesting: savedShouldDisableValidationForTesting!,
      setShouldDisableValidationForTesting: setSavedShouldDisableValidationForTesting,
      shouldShowPositionLines: savedShouldShowPositionLines!,
      setShouldShowPositionLines: setSavedShouldShowPositionLines,
      isAutoCancelTPSL: savedIsAutoCancelTPSL!,
      setIsAutoCancelTPSL: setIsAutoCancelTPSL,
      isLeverageSliderEnabled: isLeverageSliderEnabled!,
      setIsLeverageSliderEnabled: setIsLeverageSliderEnabled,

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

      externalSwapsEnabled: isBotanix ? false : externalSwapsEnabled!,
      setExternalSwapsEnabled,

      debugSwapMarketsConfig: debugSwapMarketsConfig!,
      setDebugSwapMarketsConfig,

      settingsWarningDotVisible: settingsWarningDotVisible!,
      setSettingsWarningDotVisible,

      savedTwapNumberOfParts: savedTwapNumberOfParts!,
      setSavedTWAPNumberOfParts,
    };
  }, [
    showDebugValues,
    setShowDebugValues,
    savedAllowedSlippage,
    setSavedAllowedSlippage,
    executionFeeBufferBps,
    setExecutionFeeBufferBps,
    shouldUseExecutionFeeBuffer,
    oracleKeeperInstancesConfig,
    setOracleKeeperInstancesConfig,
    savedAcceptablePriceImpactBuffer,
    setSavedAcceptablePriceImpactBuffer,
    savedShowPnlAfterFees,
    setSavedShowPnlAfterFees,
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedShouldDisableValidationForTesting,
    setSavedShouldDisableValidationForTesting,
    savedShouldShowPositionLines,
    setSavedShouldShowPositionLines,
    savedIsAutoCancelTPSL,
    setIsAutoCancelTPSL,
    isLeverageSliderEnabled,
    setIsLeverageSliderEnabled,
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
    isBotanix,
    externalSwapsEnabled,
    setExternalSwapsEnabled,
    debugSwapMarketsConfig,
    setDebugSwapMarketsConfig,
    settingsWarningDotVisible,
    setSettingsWarningDotVisible,
    savedTwapNumberOfParts,
    setSavedTWAPNumberOfParts,
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
