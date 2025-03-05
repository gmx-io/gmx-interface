import { useState } from "react";
import { ExternalSwapOutput } from "sdk/types/trade";
import { ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [baseOutput, setBaseOutput] = useState<ExternalSwapOutput>();
  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);

  return {
    baseOutput,
    shouldFallbackToInternalSwap,
    setBaseOutput,
    setShouldFallbackToInternalSwap,
  };
}
