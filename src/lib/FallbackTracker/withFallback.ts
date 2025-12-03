type WithFallbackOptions<TReturn, TEndpoint> = {
  fn: (endpoint: TEndpoint) => Promise<TReturn>;
  shouldFallback?: (error?: Error, result?: TReturn) => boolean;
  endpoints: TEndpoint[];
  onFallback?: (ctx: WithFallbackContext<TEndpoint>) => void;
};

export type WithFallbackContext<TEndpoint> = {
  endpoint: TEndpoint;
  fallbacks: TEndpoint[];
};

export async function withFallback<TReturn, TEndpoint>({
  fn,
  shouldFallback,
  onFallback,
  endpoints,
}: WithFallbackOptions<TReturn, TEndpoint>): Promise<TReturn> {
  if (endpoints.length === 0) {
    throw new Error("At least one endpoint is required");
  }

  for (const [i, endpoint] of endpoints.entries()) {
    const isLast = i === endpoints.length - 1;
    const remainingFallbacks = isLast ? [] : endpoints.slice(i + 1);

    try {
      const result = await fn(endpoint);

      const needFallback = typeof shouldFallback === "function" ? shouldFallback(undefined, result) : false;

      if (needFallback && !isLast) {
        onFallback?.({
          endpoint,
          fallbacks: remainingFallbacks,
        });
        continue;
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      const needFallback = typeof shouldFallback === "function" ? shouldFallback(err) : true;

      if (needFallback && !isLast) {
        onFallback?.({
          endpoint,
          fallbacks: remainingFallbacks,
        });
        continue;
      }

      throw err;
    }
  }

  throw new Error("All endpoints failed") as never;
}
