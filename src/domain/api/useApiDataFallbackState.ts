import { useEffect, useState } from "react";

const DEFAULT_INITIAL_FALLBACK_TIMEOUT = 3000;

type InitialFallbackState = {
  chainId: number;
  resetKey: string | null;
  apiEnabled: boolean;
  isAllowed: boolean;
};

export function useApiDataFallbackState({
  chainId,
  apiEnabled,
  apiData,
  isApiStale,
  apiError,
  isEnabled = true,
  resetKey,
  initialFallbackTimeout = DEFAULT_INITIAL_FALLBACK_TIMEOUT,
}: {
  chainId: number;
  apiEnabled: boolean;
  apiData: unknown;
  isApiStale: boolean;
  apiError: Error | undefined;
  isEnabled?: boolean;
  resetKey?: string | null;
  initialFallbackTimeout?: number;
}) {
  const normalizedResetKey = resetKey ?? null;
  const hasApiData = Boolean(apiData);
  const [initialFallbackState, setInitialFallbackState] = useState<InitialFallbackState>({
    chainId,
    resetKey: normalizedResetKey,
    apiEnabled,
    isAllowed: false,
  });

  const isInitialFallbackAllowed =
    initialFallbackState.chainId === chainId &&
    initialFallbackState.resetKey === normalizedResetKey &&
    initialFallbackState.apiEnabled === apiEnabled &&
    initialFallbackState.isAllowed;

  useEffect(() => {
    setInitialFallbackState((state) => {
      if (
        state.chainId === chainId &&
        state.resetKey === normalizedResetKey &&
        state.apiEnabled === apiEnabled &&
        !state.isAllowed
      ) {
        return state;
      }

      return {
        chainId,
        resetKey: normalizedResetKey,
        apiEnabled,
        isAllowed: false,
      };
    });
  }, [chainId, normalizedResetKey, apiEnabled, isEnabled, hasApiData]);

  useEffect(() => {
    if (!isEnabled || !apiEnabled || hasApiData || apiError || isInitialFallbackAllowed) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setInitialFallbackState({
        chainId,
        resetKey: normalizedResetKey,
        apiEnabled,
        isAllowed: true,
      });
    }, initialFallbackTimeout);

    return () => clearTimeout(timeoutId);
  }, [
    chainId,
    normalizedResetKey,
    isEnabled,
    apiEnabled,
    hasApiData,
    apiError,
    isInitialFallbackAllowed,
    initialFallbackTimeout,
  ]);

  const shouldFallbackToRpc =
    isEnabled && (!apiEnabled || Boolean(apiError) || (hasApiData ? isApiStale : isInitialFallbackAllowed));

  return {
    hasApiData,
    shouldFallbackToRpc,
    isWaitingForInitialApiData: isEnabled && apiEnabled && !hasApiData && !shouldFallbackToRpc,
    isInitialFallback: isEnabled && apiEnabled && !hasApiData && isInitialFallbackAllowed,
  };
}
