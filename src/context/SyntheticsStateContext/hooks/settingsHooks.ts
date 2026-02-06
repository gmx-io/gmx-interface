import {
  selectExecutionFeeBufferBps,
  selectSavedAllowedSlippage,
  selectShowDebugValues,
} from "../selectors/settingsSelectors";
import { useSelector } from "../utils";

export const useShowDebugValues = () => useSelector(selectShowDebugValues);
export const useSavedAllowedSlippage = () => useSelector(selectSavedAllowedSlippage);
export const useExecutionFeeBufferBps = () => useSelector(selectExecutionFeeBufferBps);
