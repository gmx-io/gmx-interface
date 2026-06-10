import { act, cleanup, render } from "@testing-library/react";
import { SWRConfig, unstable_serialize } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FreshnessMetricId } from "lib/metrics";

import { useApiDataRequest } from "./useApiDataRequest";

type ApiDataRequestResult = ReturnType<typeof useApiDataRequest<{ ok: boolean }>>;

const swrKey = ["apiDataRequestTest"];

function renderApiDataRequest(fetcher: () => Promise<{ ok: boolean }>, cache = new Map()) {
  let latestState: ApiDataRequestResult | undefined;

  function TestComponent() {
    latestState = useApiDataRequest(42161, swrKey, fetcher, FreshnessMetricId.ApiMarketsInfo, {
      refreshInterval: 1000,
      apiStaleMs: 500,
    });
    return null;
  }

  render(
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
      <TestComponent />
    </SWRConfig>
  );

  return {
    getState: () => latestState!,
  };
}

describe("useApiDataRequest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not mark missing or freshly loaded data as stale", async () => {
    let requestsCount = 0;
    const fetcher = vi.fn(() => {
      requestsCount += 1;
      return requestsCount === 1 ? Promise.resolve({ ok: true }) : new Promise<{ ok: boolean }>(() => {});
    });

    const rendered = renderApiDataRequest(fetcher);

    expect(rendered.getState().data).toBeUndefined();
    expect(rendered.getState().isStale).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(rendered.getState().data).toEqual({ ok: true });
    expect(rendered.getState().isStale).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(rendered.getState().isStale).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(rendered.getState().isStale).toBe(true);
  });

  it("marks cached stale data as stale on the first render", () => {
    const cache = new Map([
      [
        unstable_serialize(swrKey),
        {
          data: {
            data: { ok: true },
            updatedAt: Date.now() - 2000,
          },
        },
      ],
    ]);

    const rendered = renderApiDataRequest(() => new Promise<{ ok: boolean }>(() => {}), cache);

    expect(rendered.getState().data).toEqual({ ok: true });
    expect(rendered.getState().isStale).toBe(true);
  });
});
