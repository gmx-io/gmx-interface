import { isDevelopment } from "config/env";
import {
  SHOW_DEBUG_VALUES_KEY,
  getAllowedSlippageKey,
  getExecutionFeeBufferBpsKey,
  getOracleKeeperUrlKey,
} from "config/localStorage";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { EXECUTION_FEE_CONFIG_V2 } from "config/chains";
import { getOracleKeeperRandomIndex } from "config/oracleKeeper";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
  oracleKeeperUrlIndex: number;
  setOracleKeeperUrlIndex: (index: number) => void;
};

export const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext) as SettingsContextType;
}

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const [showDebugValues, setShowDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const [savedAllowedSlippage, setSavedAllowedSlippage] = useLocalStorageSerializeKey(
    getAllowedSlippageKey(chainId),
    DEFAULT_SLIPPAGE_AMOUNT
  );

  const [executionFeeBufferBps, setExecutionFeeBufferBps] = useLocalStorageSerializeKey(
    getExecutionFeeBufferBpsKey(chainId),
    EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps
  );

  const [oracleKeeperUrlIndex, setOracleKeeperUrlIndex] = useLocalStorageSerializeKey(
    getOracleKeeperUrlKey(chainId),
    getOracleKeeperRandomIndex(chainId)
  );

  const shouldUseExecutionFeeBuffer = Boolean(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);

  useEffect(() => {
    if (shouldUseExecutionFeeBuffer && executionFeeBufferBps === undefined) {
      setExecutionFeeBufferBps(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);
    }
  }, [chainId, executionFeeBufferBps, setExecutionFeeBufferBps, shouldUseExecutionFeeBuffer]);

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
      executionFeeBufferBps,
      setExecutionFeeBufferBps,
      shouldUseExecutionFeeBuffer,
      oracleKeeperUrlIndex: oracleKeeperUrlIndex!,
      setOracleKeeperUrlIndex,
    };
  }, [
    showDebugValues,
    setShowDebugValues,
    savedAllowedSlippage,
    setSavedAllowedSlippage,
    executionFeeBufferBps,
    setExecutionFeeBufferBps,
    shouldUseExecutionFeeBuffer,
    oracleKeeperUrlIndex,
    setOracleKeeperUrlIndex,
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
