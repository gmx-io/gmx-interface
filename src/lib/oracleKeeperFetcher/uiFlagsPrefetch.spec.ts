import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeUiFlagsPrefetch } from "./uiFlagsPrefetch";

const PRIMARY_URL = "https://arbitrum-api.gmxinfra.io/ui-flags/v2";
const FALLBACK_URL = "https://arbitrum-api-fallback.gmxinfra.io/ui-flags/v2";
const OTHER_CHAIN_URL = "https://avalanche-api.gmxinfra.io/ui-flags/v2";

describe("consumeUiFlagsPrefetch", () => {
  afterEach(() => {
    delete window.__uiFlagsPrefetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns undefined when no prefetch was registered", () => {
    expect(consumeUiFlagsPrefetch(PRIMARY_URL)).toBeUndefined();

    window.__uiFlagsPrefetch = {};
    expect(consumeUiFlagsPrefetch(PRIMARY_URL)).toBeUndefined();
  });

  it("resolves with the prefetched value and consumes all aliases of the same promise", async () => {
    const promise = Promise.resolve({ apiPositions: true });
    const otherChainPromise = Promise.resolve({ apiPositions: false });
    window.__uiFlagsPrefetch = {
      [PRIMARY_URL]: promise,
      [FALLBACK_URL]: promise,
      [OTHER_CHAIN_URL]: otherChainPromise,
    };

    await expect(consumeUiFlagsPrefetch(FALLBACK_URL)).resolves.toEqual({ apiPositions: true });
    expect(consumeUiFlagsPrefetch(PRIMARY_URL)).toBeUndefined();
    expect(window.__uiFlagsPrefetch[OTHER_CHAIN_URL]).toBe(otherChainPromise);
  });

  it("does not consume prefetches registered for other urls", () => {
    const promise = Promise.resolve(null);
    window.__uiFlagsPrefetch = { [PRIMARY_URL]: promise };

    expect(consumeUiFlagsPrefetch(OTHER_CHAIN_URL)).toBeUndefined();
    expect(window.__uiFlagsPrefetch[PRIMARY_URL]).toBe(promise);
  });

  it("does not consume a prefetch after the boot window", () => {
    const promise = Promise.resolve({ apiPositions: true });
    window.__uiFlagsPrefetch = { [PRIMARY_URL]: promise };
    vi.spyOn(performance, "now").mockReturnValue(20_000);

    expect(consumeUiFlagsPrefetch(PRIMARY_URL)).toBeUndefined();
    expect(window.__uiFlagsPrefetch[PRIMARY_URL]).toBeUndefined();
  });

  it("resolves null instead of waiting forever on a hung prefetch", async () => {
    vi.useFakeTimers();
    window.__uiFlagsPrefetch = { [PRIMARY_URL]: new Promise(() => undefined) };

    const consumed = consumeUiFlagsPrefetch(PRIMARY_URL)!;
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(consumed).resolves.toBeNull();
  });
});
