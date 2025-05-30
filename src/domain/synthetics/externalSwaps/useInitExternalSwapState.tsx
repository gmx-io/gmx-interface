import { useState } from "react";

import { ExternalSwapQuote } from "sdk/types/trade";

import { ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [baseOutput, setBaseOutput] = useState<ExternalSwapQuote>();
  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);

  return {
    baseOutput,
    shouldFallbackToInternalSwap,
    setBaseOutput,
    setShouldFallbackToInternalSwap,
  };
}
