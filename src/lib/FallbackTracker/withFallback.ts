type WithFallbackOptions<TReturn, TEndpoint> = {
  fn: (endpoint: TEndpoint) => Promise<TReturn>;
  retryCount: number;
  shouldRetry?: (error?: Error, result?: TReturn) => boolean;
  shouldFallback?: (error?: Error, result?: TReturn) => boolean;
  endpoints: TEndpoint[];
  onFallback?: (ctx: WithFallbackContext<TEndpoint>) => void;
  onRetry?: (ctx: WithFallbackContext<TEndpoint>) => void;
};

export type WithFallbackContext<TEndpoint> = {
  endpoint: TEndpoint;
  retryCount: number;
  fallbacks: TEndpoint[];
};

// Maximum recursion depth to prevent stack overflow
// Calculated as: retryCount × endpoints.length (worst case: all retries + all fallbacks)
const MAX_RECURSION_DEPTH = 30;

export function withFallback<TReturn, TEndpoint>({
  fn,
  shouldRetry,
  shouldFallback,
  onFallback,
  onRetry,
  retryCount,
  endpoints: fallbacks,
}: WithFallbackOptions<TReturn, TEndpoint>) {
  if (retryCount < 0) {
    throw new Error("retryCount must be >= 0");
  }

  if (fallbacks.length === 0) {
    throw new Error("At least one endpoint is required");
  }

  let recursionDepth = 0;

  const call = (ctx: { endpoint: TEndpoint; retryCount: number; fallbacks: TEndpoint[] }) => {
    recursionDepth++;

    const handleResult = (error?: Error, result?: TReturn) => {
      const needRetry = typeof shouldRetry === "function" ? shouldRetry(error) : Boolean(error);
      const isLastRetry = ctx.retryCount == 0;

      if (needRetry && !isLastRetry) {
        if (recursionDepth >= MAX_RECURSION_DEPTH) {
          if (error) {
            return Promise.reject(error);
          }
          return Promise.resolve(result);
        }

        onRetry?.(ctx);

        return call({
          retryCount: ctx.retryCount - 1,
          fallbacks: ctx.fallbacks,
          endpoint: ctx.endpoint,
        });
      }

      const needFallback = typeof shouldFallback === "function" ? shouldFallback(error) : Boolean(error);
      const isLastFallback = ctx.fallbacks.length == 0;

      if (needFallback && !isLastFallback) {
        if (recursionDepth >= MAX_RECURSION_DEPTH) {
          if (error) {
            return Promise.reject(error);
          }
          return Promise.resolve(result);
        }

        const nextFallback = ctx.fallbacks[0];
        const nextFallbacks = ctx.fallbacks.slice(1);

        onFallback?.(ctx);

        return call({
          // reset retry count on fallback
          retryCount: retryCount,
          fallbacks: nextFallbacks,
          endpoint: nextFallback,
        });
      }

      // Reset recursion depth on final resolution (success or final error)
      if (error) {
        recursionDepth = 0;
        return Promise.reject(error);
      }

      recursionDepth = 0;
      return Promise.resolve(result);
    };

    return fn(ctx.endpoint)
      .then((result) => {
        return handleResult(undefined, result);
      })
      .catch((error) => {
        return handleResult(error);
      });
  };

  return call({
    retryCount: retryCount,
    endpoint: fallbacks[0],
    fallbacks: fallbacks.slice(1),
  });
}
