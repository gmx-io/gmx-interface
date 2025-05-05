import throttle from "lodash/throttle";
import { useState, useRef, useEffect } from "react";

type SkipFn = (nextThrottleMs?: number) => void;
type EstimatorParams<D extends any[]> = {
  params: D;
  skip: SkipFn;
};
type Estimator<T, D extends any[]> = (args: EstimatorParams<D>) => Promise<T | void>;
type AsyncEstimationResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  lastEstimated: number;
};

export function useThrottledAsyncEstimation<T, D extends any[]>(
  estimator: Estimator<T, D>,
  deps: D,
  options: {
    throttleMs?: number;
    enabled?: boolean;
    enableLoading?: boolean;
  } = {}
) {
  const [state, setState] = useState<AsyncEstimationResult<T>>({
    data: undefined,
    isLoading: false,
    error: undefined,
    lastEstimated: 0,
  });

  const [dynamicThrottleMs, setDynamicThrottleMs] = useState(options.throttleMs ?? 5000);
  const latestEstimator = useRef(estimator);

  useEffect(() => {
    latestEstimator.current = estimator;
  }, [estimator]);

  // Recreate throttled function if throttleMs changes
  const throttledFnRef = useRef<ReturnType<typeof throttle>>();
  useEffect(() => {
    throttledFnRef.current = throttle(
      async (...args: D) => {
        if (options.enabled === false) return;

        let skipCalled = false;
        const skip: SkipFn = (nextThrottleMs) => {
          skipCalled = true;

          if (nextThrottleMs !== undefined) {
            setDynamicThrottleMs(nextThrottleMs);
          }
        };

        if (options.enableLoading) {
          setState((prev) => ({ ...prev, isLoading: true }));
        }

        try {
          const result = await latestEstimator.current({ params: args as D, skip });

          if (!skipCalled) {
            setState({
              data: result as T,
              isLoading: false,
              error: undefined,
              lastEstimated: Date.now(),
            });
          } else if (options.enableLoading) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
            }));
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
      { leading: true, trailing: true }
    );
    return () => throttledFnRef.current?.cancel();
  }, [dynamicThrottleMs, options.enableLoading, options.enabled]);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }
    throttledFnRef.current?.(...deps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, options.enabled, dynamicThrottleMs]);

  return state;
}
