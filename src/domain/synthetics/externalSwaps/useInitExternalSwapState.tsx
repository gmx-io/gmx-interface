import { useState } from "react";

import { ExternalSwapRequestResult, ExternalSwapState } from "./types";

export function useInitExternalSwapState(): ExternalSwapState {
  const [requestResult, setRequestResult] = useState<ExternalSwapRequestResult>();
  const [shouldFallbackToInternalSwap, setShouldFallbackToInternalSwap] = useState(false);
  const [shouldForceExternalSwap, setShouldForceExternalSwap] = useState(false);

  return {
    requestResult,
    shouldFallbackToInternalSwap,
    shouldForceExternalSwap,
    setRequestResult,
    setShouldFallbackToInternalSwap,
    setShouldForceExternalSwap,
  };
}
