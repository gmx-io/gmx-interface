import { useState } from "react";
import { ExternalSwapState } from "./types";
import { ExternalSwapOutput } from "../trade";

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
