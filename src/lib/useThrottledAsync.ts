import throttle from "lodash/throttle";
import { useEffect, useRef, useState } from "react";

import { useLatestValueRef } from "./useLatestValueRef";

type AsyncFnParams<D extends object> = {
  params: D;
};

type AsyncFn<T, D extends object> = (args: AsyncFnParams<D>) => Promise<T | RetryResult<T>>;

export type AsyncResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  lastEstimated: number;
  promise: Promise<T> | undefined;
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
    forceRecalculate = false,
    withLoading = false,
    leading = true,
    trailing = false,
  }: {
    params: D | undefined;
    throttleMs?: number;
    forceRecalculate?: boolean;
    withLoading?: boolean;
    leading?: boolean;
    trailing?: boolean;
  }
) {
  const [state, setState] = useState<AsyncResult<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
    promise: undefined,
    lastEstimated: 0,
  });

  const [dynamicThrottleMs, setDynamicThrottleMs] = useState(throttleMs);

  const latestFnRef = useLatestValueRef(estimator);

  const latestHandlerRef = useRef<(args: D) => Promise<void>>();
  // Recreate throttled function if throttleMs changes
  const throttledFnRef = useRef<ReturnType<typeof throttle>>();

  const isRetryRef = useRef(false);

  useEffect(() => {
    latestHandlerRef.current = async (args: D) => {
      if (isRetryRef.current) {
        setDynamicThrottleMs(throttleMs);
        isRetryRef.current = false;
      }

      try {
        const estimatorPromise = latestFnRef.current({ params: args as D });

        if (withLoading) {
          const floatingPromise = estimatorPromise.then((result) => {
            if (isRetryResult(result)) {
              return result.data;
            }

            return result;
          });
          setState((prev) => ({ ...prev, isLoading: true, promise: floatingPromise }));
        }

        const result = await estimatorPromise;

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
            promise: Promise.resolve(result),
            lastEstimated: Date.now(),
          });
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          data: undefined,
          error: error as Error,
          isLoading: false,
          promise: undefined,
          lastEstimated: Date.now(),
        }));
      }
    };
  }, [latestFnRef, throttleMs, withLoading]);

  useEffect(() => {
    throttledFnRef.current = throttle(latestHandlerRef.current!, dynamicThrottleMs, { leading, trailing });
    return () => throttledFnRef.current?.cancel();
  }, [dynamicThrottleMs, leading, trailing]);

  useEffect(() => {
    if (forceRecalculate && params) {
      latestHandlerRef.current?.(params);
    }
  }, [forceRecalculate, params]);

  useEffect(() => {
    if (!params) {
      return;
    }

    throttledFnRef.current?.(params);
  }, [params]);

  return state;
}
