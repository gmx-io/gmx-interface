import throttle from "lodash/throttle";
import { useState, useRef, useEffect } from "react";

type AsyncFnParams<D extends any[]> = {
  params: D;
};

type AsyncFn<T, D extends any[]> = (args: AsyncFnParams<D>) => Promise<T | RetryResult<T>>;

type AsyncResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  lastEstimated: number;
};

const RETRY_SYMBOL = Symbol("retry");

type RetryResult<T> = {
  retry: typeof RETRY_SYMBOL;
  delay?: number;
  data: T;
};

export function retry<T>(data: T, delay?: number): RetryResult<T> {
  return {
    retry: RETRY_SYMBOL,
    data,
    delay,
  };
}

export function useThrottledAsync<T, D extends any[]>(
  estimator: AsyncFn<T, D>,
  deps: D,
  options: {
    throttleMs?: number;
    enabled?: boolean;
    withLoading?: boolean;
    leading?: boolean;
    trailing?: boolean;
  } = {}
) {
  const { throttleMs = 5000, enabled = true, withLoading = false, leading, trailing } = options;

  const [state, setState] = useState<AsyncResult<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
    lastEstimated: 0,
  });

  const [dynamicThrottleMs, setDynamicThrottleMs] = useState(throttleMs);
  const latestEstimator = useRef(estimator);

  useEffect(() => {
    latestEstimator.current = estimator;
  }, [estimator]);

  // Recreate throttled function if throttleMs changes
  const throttledFnRef = useRef<ReturnType<typeof throttle>>();

  useEffect(() => {
    throttledFnRef.current = throttle(
      async (...args: D) => {
        if (enabled === false) {
          return;
        }

        if (withLoading) {
          setState((prev) => ({ ...prev, isLoading: true }));
        }

        try {
          const result = await latestEstimator.current({ params: args as D });

          const retryResult = result as RetryResult<T>;

          if (retryResult.retry === RETRY_SYMBOL) {
            setDynamicThrottleMs(retryResult.delay ?? 0);
            setState((prev) => ({
              ...prev,
              data: retryResult.data,
              isLoading: false,
            }));
            return;
          } else {
            setState({
              data: result as T,
              isLoading: false,
              error: undefined,
              lastEstimated: Date.now(),
            });
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            error: error as Error,
            isLoading: false,
            lastEstimated: Date.now(),
          }));
        }
      },
      dynamicThrottleMs,
      { leading, trailing }
    );
    return () => throttledFnRef.current?.cancel();
  }, [dynamicThrottleMs, withLoading, enabled, leading, trailing]);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }
    throttledFnRef.current?.(...deps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, dynamicThrottleMs]);

  return state;
}
