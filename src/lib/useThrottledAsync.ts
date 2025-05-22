import throttle from "lodash/throttle";
import { useState, useRef, useEffect } from "react";

import { EMPTY_ARRAY } from "./objects";

type AsyncFnParams<D extends object> = {
  params: D;
};

type AsyncFn<T, D extends object> = (args: AsyncFnParams<D>) => Promise<T | RetryResult<T>>;

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

function isRetryResult<T>(result: T | RetryResult<T> | undefined): result is RetryResult<T> {
  return typeof result === "object" && result !== null && "retry" in result && result.retry === RETRY_SYMBOL;
}

export function useThrottledAsync<T, D extends object>(
  estimator: AsyncFn<T, D>,
  {
    params,
    throttleMs = 5000,
    dataKey = EMPTY_ARRAY,
    withLoading = false,
    leading = true,
    trailing = false,
  }: {
    params: D | undefined;
    throttleMs?: number;
    dataKey?: any[];
    withLoading?: boolean;
    leading?: boolean;
    trailing?: boolean;
  }
) {
  const [state, setState] = useState<AsyncResult<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
    lastEstimated: 0,
  });

  const [dynamicThrottleMs, setDynamicThrottleMs] = useState(throttleMs);
  const latestEstimatorRef = useRef(estimator);
  const isRetryRef = useRef(false);

  useEffect(() => {
    latestEstimatorRef.current = estimator;
  }, [estimator]);

  // Recreate throttled function if throttleMs changes
  const throttledFnRef = useRef<ReturnType<typeof throttle>>();

  useEffect(() => {
    throttledFnRef.current = throttle(
      async (args: D) => {
        if (isRetryRef.current) {
          setDynamicThrottleMs(throttleMs);
          isRetryRef.current = false;
        }

        if (withLoading) {
          setState((prev) => ({ ...prev, isLoading: true }));
        }

        try {
          const result = await latestEstimatorRef.current({ params: args as D });

          if (isRetryResult(result)) {
            setDynamicThrottleMs(result.delay ?? 0);
            isRetryRef.current = true;
            setState((prev) => ({
              ...prev,
              data: result.data,
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
            data: undefined,
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
  }, [dynamicThrottleMs, withLoading, leading, trailing, throttleMs]);

  useEffect(() => {
    if (!params) {
      return;
    }

    throttledFnRef.current?.(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, dynamicThrottleMs]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      data: undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dataKey);

  return state;
}
