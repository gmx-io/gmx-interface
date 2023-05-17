import { isDevelopment } from "config/env";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, createContext, useContext, useMemo } from "react";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
};

export const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext) as SettingsContextType;
}

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const [showDebugValues, setShowDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
    };
  }, [setShowDebugValues, showDebugValues]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
