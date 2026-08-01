import { afterEach, describe, expect, it } from "vitest";

import { consumeUiFlagsPrefetch } from "./uiFlagsPrefetch";

const URL = "https://arbitrum-api.gmxinfra.io/ui-flags/v2";

describe("consumeUiFlagsPrefetch", () => {
  afterEach(() => {
    delete window.__uiFlagsPrefetch;
  });

  it("returns undefined when no prefetch was registered", () => {
    expect(consumeUiFlagsPrefetch(URL)).toBeUndefined();

    window.__uiFlagsPrefetch = {};
    expect(consumeUiFlagsPrefetch(URL)).toBeUndefined();
  });

  it("returns the prefetched promise exactly once", async () => {
    const promise = Promise.resolve({ apiPositions: true });
    window.__uiFlagsPrefetch = { [URL]: promise };

    expect(consumeUiFlagsPrefetch(URL)).toBe(promise);
    expect(consumeUiFlagsPrefetch(URL)).toBeUndefined();
  });

  it("does not consume prefetches registered for other urls", () => {
    const promise = Promise.resolve(null);
    window.__uiFlagsPrefetch = { [URL]: promise };

    expect(consumeUiFlagsPrefetch("https://avalanche-api.gmxinfra.io/ui-flags/v2")).toBeUndefined();
    expect(consumeUiFlagsPrefetch(URL)).toBe(promise);
  });
});
