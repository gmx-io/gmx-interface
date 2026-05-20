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
}: {
  domain: Domain;
  chainId: number;
  apiEnabled: boolean;
  apiData: unknown;
  isApiStale: boolean;
  apiError: Error | undefined;
}) {
  const wasInFallbackRef = useRef(false);

  useEffect(() => {
    const inFallback = apiEnabled && Boolean(apiError || (apiData && isApiStale));

    if (inFallback && !wasInFallbackRef.current) {
      metrics.pushCounter<ApiDataFallbackCounter>("apiData.fallback", {
        domain,
        reason: apiError ? "error" : "stale",
        chainId,
      });
    }

    wasInFallbackRef.current = inFallback;
  }, [apiEnabled, isApiStale, apiError, apiData, chainId, domain]);
}
