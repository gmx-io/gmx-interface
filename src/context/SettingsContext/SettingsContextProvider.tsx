import { isDevelopment } from "config/env";
import { SHOW_DEBUG_VALUES_KEY, getAllowedSlippageKey, getExecutionFeeBufferBpsKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import { DEFAULT_EXECUTION_FEE_BUFFER_BPS, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, createContext, useContext, useMemo } from "react";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
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
    DEFAULT_EXECUTION_FEE_BUFFER_BPS[chainId]
  );

  const shouldUseExecutionFeeBuffer = Boolean(DEFAULT_EXECUTION_FEE_BUFFER_BPS[chainId]);

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
      executionFeeBufferBps,
      setExecutionFeeBufferBps,
      shouldUseExecutionFeeBuffer,
    };
  }, [
    showDebugValues,
    setShowDebugValues,
    savedAllowedSlippage,
    setSavedAllowedSlippage,
    executionFeeBufferBps,
    setExecutionFeeBufferBps,
    shouldUseExecutionFeeBuffer,
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
