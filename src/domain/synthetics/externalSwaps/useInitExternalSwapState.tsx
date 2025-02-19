import { useState } from "react";
import { ExternalSwapOutput } from "sdk/types/trade";
import { ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [baseOutput, setBaseOutput] = useState<ExternalSwapOutput>();
  const [fails, setFails] = useState(0);
  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);

  return {
    baseOutput,
    fails,
    shouldFallbackToInternalSwap,
    setBaseOutput,
    setFails,
    setShouldFallbackToInternalSwap,
  };
}
