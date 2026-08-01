declare global {
  interface Window {
    __uiFlagsPrefetch?: Record<string, Promise<unknown> | undefined>;
  }
}

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

  return prefetched;
}
