import { ExternalSwapQuote } from "sdk/utils/trade/types";

export type ExternalSwapState = {
  baseOutput: ExternalSwapQuote | undefined;
  shouldFallbackToInternalSwap: boolean;
  isLoading: boolean;
  setBaseOutput: (output: ExternalSwapQuote | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
};
