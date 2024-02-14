import { useSyntheticsStateSelector as useSelector } from "../SyntheticsStateContextProvider";
import {
  selectExecutionFeeBufferBps,
  selectOracleKeeperInstancesConfig,
  selectSavedAcceptablePriceImpactBuffer,
  selectSavedAllowedSlippage,
  selectSetExecutionFeeBufferBps,
  selectSetOracleKeeperInstancesConfig,
  selectSetSavedAcceptablePriceImpactBuffer,
  selectSetSavedAllowedSlippage,
  selectSetShowDebugValues,
  selectShouldUseExecutionFeeBuffer,
  selectShowDebugValues,
} from "../selectors/settingsSelectors";

export const useShowDebugValues = () => useSelector(selectShowDebugValues);
export const useSetShowDebugValues = () => useSelector(selectSetShowDebugValues);
export const useSavedAllowedSlippage = () => useSelector(selectSavedAllowedSlippage);
export const useSetSavedAllowedSlippage = () => useSelector(selectSetSavedAllowedSlippage);
export const useExecutionFeeBufferBps = () => useSelector(selectExecutionFeeBufferBps);
export const useSetExecutionFeeBufferBps = () => useSelector(selectSetExecutionFeeBufferBps);
export const useSavedAcceptablePriceImpactBuffer = () => useSelector(selectSavedAcceptablePriceImpactBuffer);
export const useSetSavedAcceptablePriceImpactBuffer = () => useSelector(selectSetSavedAcceptablePriceImpactBuffer);
export const useShouldUseExecutionFeeBuffer = () => useSelector(selectShouldUseExecutionFeeBuffer);
export const useOracleKeeperInstancesConfig = () => useSelector(selectOracleKeeperInstancesConfig);
export const useSetOracleKeeperInstancesConfig = () => useSelector(selectSetOracleKeeperInstancesConfig);
