import { ExternalSwapOutput } from "sdk/types/trade";

export type ExternalSwapState = {
  baseOutput: ExternalSwapOutput | undefined;
  fails: number;
  shouldFallbackToInternalSwap: boolean;
  setBaseOutput: (output: ExternalSwapOutput | undefined) => void;
  setFails: (fails: number | ((fails: number) => number)) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
};
