type WithFallbackOptions<TReturn, TEndpoint> = {
  fn: (endpoint: TEndpoint) => Promise<TReturn>;
  retryCount: number;
  shouldRetry?: (error?: Error, result?: TReturn) => boolean;
  shouldFallback?: (error?: Error, result?: TReturn) => boolean;
  fallbacks: TEndpoint[];
  onFallback: () => void;
  onRetry: () => void;
};

export function withFallback<TReturn, TEndpoint>({
  fn,
  shouldRetry,
  shouldFallback,
  onFallback,
  onRetry,
  retryCount,
  fallbacks,
}: WithFallbackOptions<TReturn, TEndpoint>) {
  const call = (ctx: { endpoint: TEndpoint; retryCount: number; fallbacks: TEndpoint[] }) => {
    const handleResult = (error?: Error, result?: TReturn) => {
      const needRetry = typeof shouldRetry === "function" ? shouldRetry(error) : Boolean(error);
      const isLastRetry = ctx.retryCount == 0;

      if (needRetry && !isLastRetry) {
        onRetry?.();

        return call({
          retryCount: ctx.retryCount - 1,
          fallbacks: ctx.fallbacks,
          endpoint: ctx.endpoint,
        });
      }

      const needFallback = typeof shouldFallback === "function" ? shouldFallback(error) : Boolean(error);
      const isLastFallback = ctx.fallbacks.length == 0;

      if (needFallback && !isLastFallback) {
        const nextFallback = ctx.fallbacks[0];
        const nextFallbacks = ctx.fallbacks.slice(1);

        onFallback?.();

        return call({
          retryCount: ctx.retryCount,
          fallbacks: nextFallbacks,
          endpoint: nextFallback,
        });
      }

      if (error) {
        return Promise.reject(error);
      }

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
