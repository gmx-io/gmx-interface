import { ExternalSwapOutput } from "sdk/types/trade";

export type ExternalSwapState = {
  baseOutput: ExternalSwapOutput | undefined;
  shouldFallbackToInternalSwap: boolean;
  setBaseOutput: (output: ExternalSwapOutput | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
};
