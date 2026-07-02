import { useEffect, useRef } from "react";

import { metrics } from "lib/metrics";
import { ApiDataFallbackCounter } from "lib/metrics/types";

type Domain = ApiDataFallbackCounter["data"]["domain"];

export function useApiDataFallbackCounter({
  domain,
  chainId,
  apiEnabled,
  apiData,
  isApiStale,
  apiError,
  isInitialFallback,
  resetKey,
}: {
  domain: Domain;
  chainId: number;
  apiEnabled: boolean;
  apiData: unknown;
  isApiStale: boolean;
  apiError: Error | undefined;
  isInitialFallback?: boolean;
  resetKey?: string | null;
}) {
  const wasInFallbackRef = useRef(false);

  useEffect(() => {
    wasInFallbackRef.current = false;
  }, [chainId, resetKey]);

  useEffect(() => {
    const reason = apiError ? "error" : apiData && isApiStale ? "stale" : isInitialFallback ? "initial" : undefined;

    if (!apiEnabled || !reason) {
      wasInFallbackRef.current = false;
      return;
    }

    if (!wasInFallbackRef.current) {
      metrics.pushCounter<ApiDataFallbackCounter>("apiData.fallback", {
        domain,
        reason,
        chainId,
      });
    }

    wasInFallbackRef.current = true;
  }, [apiEnabled, isApiStale, apiError, apiData, isInitialFallback, chainId, domain, resetKey]);
}
