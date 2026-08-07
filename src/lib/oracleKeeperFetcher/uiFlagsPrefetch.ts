declare global {
  interface Window {
    __uiFlagsPrefetch?: Record<string, Promise<unknown> | undefined>;
  }
}

const PREFETCH_MAX_AGE_MS = 15_000;
const PREFETCH_WAIT_TIMEOUT_MS = 5_000;

// Started by the inline script in index.html during HTML parse; one promise per chain is
// registered under every keeper host alias and consumed at most once.
export function consumeUiFlagsPrefetch(url: string): Promise<unknown> | undefined {
  if (typeof window === "undefined" || !window.__uiFlagsPrefetch) {
    return undefined;
  }

  const prefetched = window.__uiFlagsPrefetch[url];

  if (prefetched === undefined) {
    return undefined;
  }

  for (const [key, value] of Object.entries(window.__uiFlagsPrefetch)) {
    if (value === prefetched) {
      delete window.__uiFlagsPrefetch[key];
    }
  }

  if (performance.now() > PREFETCH_MAX_AGE_MS) {
    return undefined;
  }

  return Promise.race([
    prefetched,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), PREFETCH_WAIT_TIMEOUT_MS);
    }),
  ]);
}
