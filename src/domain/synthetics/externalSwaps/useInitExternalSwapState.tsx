import { useRef, useState } from "react";

import { ExternalSwapQuote } from "sdk/utils/trade/types";

import { BuildExternalSwapCalldataFn, ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [baseOutput, setBaseOutput] = useState<ExternalSwapQuote>();
  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);
  const buildCalldataRef = useRef<BuildExternalSwapCalldataFn>();

  return {
    baseOutput,
    shouldFallbackToInternalSwap,
    buildCalldataRef,
    setBaseOutput,
    setShouldFallbackToInternalSwap,
  };
}
