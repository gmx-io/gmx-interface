import { ExternalSwapQuote } from "sdk/types/trade";

export type ExternalSwapState = {
  baseOutput: ExternalSwapQuote | undefined;
  fails: number;
  shouldFallbackToInternalSwap: boolean;
  setBaseOutput: (output: ExternalSwapQuote | undefined) => void;
  setFails: (fails: number | ((fails: number) => number)) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
};
