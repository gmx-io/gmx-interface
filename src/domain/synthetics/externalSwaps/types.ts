import { ExternalSwapQuote } from "sdk/types/trade";

export type ExternalSwapState = {
  baseOutput: ExternalSwapQuote | undefined;
  shouldFallbackToInternalSwap: boolean;
  setBaseOutput: (output: ExternalSwapQuote | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
};
