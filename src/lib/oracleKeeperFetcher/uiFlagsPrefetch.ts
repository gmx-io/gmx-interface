declare global {
  interface Window {
    __uiFlagsPrefetch?: Record<string, Promise<unknown> | undefined>;
  }
}

const PREFETCH_MAX_AGE_MS = 15_000;

// index.html kicks off ui-flags requests during HTML parse (see the inline script there); the
// first fetchUiFlags call for a url consumes that in-flight promise instead of re-requesting.
export function consumeUiFlagsPrefetch(url: string): Promise<unknown> | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const prefetched = window.__uiFlagsPrefetch?.[url];

  if (window.__uiFlagsPrefetch) {
    delete window.__uiFlagsPrefetch[url];
  }

  // Boot-time optimization only: consuming it long after load (e.g. on a later chain switch)
  // would replay stale flags as a fresh response.
  if (performance.now() > PREFETCH_MAX_AGE_MS) {
    return undefined;
  }

  return prefetched;
}
