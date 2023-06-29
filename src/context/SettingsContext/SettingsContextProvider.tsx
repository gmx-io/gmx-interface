import { isDevelopment } from "config/env";
import { SHOW_DEBUG_VALUES_KEY, getAllowedSlippageKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, createContext, useContext, useMemo } from "react";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
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

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
    };
  }, [setShowDebugValues, showDebugValues, setSavedAllowedSlippage, savedAllowedSlippage]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
