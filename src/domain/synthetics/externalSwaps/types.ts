import { ExternalSwapQuote } from "sdk/utils/trade/types";

export type ExternalSwapState = {
  baseOutput: ExternalSwapQuote | undefined;
  shouldFallbackToInternalSwap: boolean;
  shouldForceExternalSwap: boolean;
  isHookLoading: boolean;
  setBaseOutput: (output: ExternalSwapQuote | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
  setShouldForceExternalSwap: (shouldForce: boolean) => void;
  setIsHookLoading: (isHookLoading: boolean) => void;
};
