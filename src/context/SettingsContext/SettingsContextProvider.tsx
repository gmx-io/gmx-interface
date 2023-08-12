import { isDevelopment } from "config/env";
import {
  ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
  SHOW_DEBUG_VALUES_KEY,
  getAllowedSlippageKey,
  getExecutionFeeBufferBpsKey,
} from "config/localStorage";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useMemo } from "react";
import { EXECUTION_FEE_CONFIG_V2, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getOracleKeeperRandomIndex } from "config/oracleKeeper";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
  oracleKeeperInstancesConfig: { [chainId: number]: number };
  setOracleKeeperInstancesConfig: Dispatch<SetStateAction<{ [chainId: number]: number } | undefined>>;
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
  const shouldUseExecutionFeeBuffer = Boolean(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);

  const [oracleKeeperInstancesConfig, setOracleKeeperInstancesConfig] = useLocalStorageSerializeKey(
    ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
    SUPPORTED_CHAIN_IDS.reduce((acc, chainId) => {
      acc[chainId] = getOracleKeeperRandomIndex(chainId);
      return acc;
    }, {} as { [chainId: number]: number })
  );

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
      oracleKeeperInstancesConfig: oracleKeeperInstancesConfig!,
      setOracleKeeperInstancesConfig,
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
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}
