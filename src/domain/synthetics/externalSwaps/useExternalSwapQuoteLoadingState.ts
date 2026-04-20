import { useEffect, useRef, useState } from "react";

export function useExternalSwapQuoteLoadingState<TData, TError>({
  userParamsKey,
  data,
  error,
  isInitialFetch,
  enabled,
}: {
  userParamsKey: string | null;
  data: TData | undefined;
  error?: TError | undefined;
  isInitialFetch?: boolean;
  enabled: boolean;
}): boolean {
  const [resolvedUserParams, setResolvedUserParams] = useState<string | null>(null);
  const prevDataRef = useRef<TData | undefined>(undefined);
  const prevErrorRef = useRef<TError | undefined>(undefined);

  useEffect(() => {
    const dataChanged = data !== prevDataRef.current;
    const errorChanged = error !== prevErrorRef.current;
    prevDataRef.current = data;
    prevErrorRef.current = error;

    if (dataChanged && data && userParamsKey) {
      setResolvedUserParams(userParamsKey);
    }
    if (errorChanged && error && userParamsKey && !isInitialFetch) {
      setResolvedUserParams(userParamsKey);
    }
    if (!enabled) {
      setResolvedUserParams(null);
    }
  }, [data, error, isInitialFetch, userParamsKey, enabled]);

  return userParamsKey !== null && userParamsKey !== resolvedUserParams;
}
