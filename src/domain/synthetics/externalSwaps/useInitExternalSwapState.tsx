import { useState } from "react";
import { ExternalSwapQuote } from "sdk/types/trade";
import { ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [baseOutput, setBaseOutput] = useState<ExternalSwapQuote>();
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
