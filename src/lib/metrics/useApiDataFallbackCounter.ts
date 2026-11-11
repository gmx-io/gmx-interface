import { useEffect, useId } from "react";

import { metrics } from "lib/metrics";
import { ApiDataFallbackCounter } from "lib/metrics/types";

type Domain = ApiDataFallbackCounter["data"]["domain"];

const HOOKS_IN_FALLBACK_BY_SCOPE = new Map<string, Set<string>>();

function getHooksInFallback(fallbackScope: string): Set<string> {
  let hooksInFallback = HOOKS_IN_FALLBACK_BY_SCOPE.get(fallbackScope);

  if (!hooksInFallback) {
    hooksInFallback = new Set();
    HOOKS_IN_FALLBACK_BY_SCOPE.set(fallbackScope, hooksInFallback);
  }

  return hooksInFallback;
}

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
  const hookId = useId();
  const fallbackScope = `${domain}:${chainId}:${resetKey ?? ""}`;

  useEffect(() => {
    return () => {
      getHooksInFallback(fallbackScope).delete(hookId);
    };
  }, [fallbackScope, hookId]);

  useEffect(() => {
    const reason = apiError ? "error" : apiData && isApiStale ? "stale" : isInitialFallback ? "initial" : undefined;
    const hooksInFallback = getHooksInFallback(fallbackScope);

    if (!apiEnabled || !reason) {
      hooksInFallback.delete(hookId);
      return;
    }

    const isOutageStart = hooksInFallback.size === 0;
    hooksInFallback.add(hookId);

    if (isOutageStart) {
      metrics.pushCounter<ApiDataFallbackCounter>("apiData.fallback", {
        domain,
        reason,
        chainId,
      });
    }
  }, [apiEnabled, isApiStale, apiError, apiData, isInitialFallback, chainId, domain, fallbackScope, hookId]);
}
