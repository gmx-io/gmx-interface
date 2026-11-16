export function withFallback<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ])
    .catch(() => fallback)
    .finally(() => clearTimeout(timeoutId));
}
