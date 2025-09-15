import {
  selectDebugSwapMarketsConfig,
  selectExecutionFeeBufferBps,
  selectSavedAcceptablePriceImpactBuffer,
  selectSavedAllowedSlippage,
  selectSetDebugSwapMarketsConfig,
  selectSetExecutionFeeBufferBps,
  selectSetSavedAcceptablePriceImpactBuffer,
  selectSetSavedAllowedSlippage,
  selectSetShowDebugValues,
  selectShouldUseExecutionFeeBuffer,
  selectShowDebugValues,
} from "../selectors/settingsSelectors";
import { useSelector } from "../utils";

export const useShowDebugValues = () => useSelector(selectShowDebugValues);
export const useSetShowDebugValues = () => useSelector(selectSetShowDebugValues);
export const useSavedAllowedSlippage = () => useSelector(selectSavedAllowedSlippage);
export const useSetSavedAllowedSlippage = () => useSelector(selectSetSavedAllowedSlippage);
export const useExecutionFeeBufferBps = () => useSelector(selectExecutionFeeBufferBps);
export const useSetExecutionFeeBufferBps = () => useSelector(selectSetExecutionFeeBufferBps);
export const useSavedAcceptablePriceImpactBuffer = () => useSelector(selectSavedAcceptablePriceImpactBuffer);
export const useSetSavedAcceptablePriceImpactBuffer = () => useSelector(selectSetSavedAcceptablePriceImpactBuffer);
export const useShouldUseExecutionFeeBuffer = () => useSelector(selectShouldUseExecutionFeeBuffer);
export const useDebugSwapMarketsConfig = () => useSelector(selectDebugSwapMarketsConfig);
export const useSetDebugSwapMarketsConfig = () => useSelector(selectSetDebugSwapMarketsConfig);
