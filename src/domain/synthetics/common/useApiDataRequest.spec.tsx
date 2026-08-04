import { act, cleanup, render } from "@testing-library/react";
import noop from "lodash/noop";
import { SWRConfig, unstable_serialize } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FreshnessMetricId } from "lib/metrics";

import { useApiDataRequest } from "./useApiDataRequest";

type ApiDataRequestResult = ReturnType<typeof useApiDataRequest<{ ok: boolean }>>;

const swrKey = ["apiDataRequestTest"];

type TestComponentProps = {
  enabled?: boolean;
  requestKey?: unknown[];
};

function renderApiDataRequest(fetcher: () => Promise<{ ok: boolean }>, cache = new Map()) {
  let latestState: ApiDataRequestResult | undefined;

  function TestComponent({ enabled, requestKey }: TestComponentProps) {
    latestState = useApiDataRequest(42161, requestKey ?? swrKey, fetcher, FreshnessMetricId.ApiMarketsInfo, {
      refreshInterval: 1000,
      apiStaleMs: 500,
      enabled,
    });
    return null;
  }

  const swrConfig = { provider: () => cache, dedupingInterval: 0 };
  const renderElement = (props: TestComponentProps = {}) => (
    <SWRConfig value={swrConfig}>
      <TestComponent {...props} />
    </SWRConfig>
  );

  const result = render(renderElement());

  return {
    getState: () => latestState!,
    rerenderWith: (props: TestComponentProps) => result.rerender(renderElement(props)),
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
      return requestsCount === 1 ? Promise.resolve({ ok: true }) : new Promise<{ ok: boolean }>(noop);
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

  it("retains the last response while the request is disabled and drops it when the key changes", async () => {
    const fetcher = vi.fn(() => Promise.resolve({ ok: true }));
    const rendered = renderApiDataRequest(fetcher);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(rendered.getState().data).toEqual({ ok: true });

    rendered.rerenderWith({ enabled: false });

    expect(rendered.getState().data).toEqual({ ok: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(rendered.getState().data).toEqual({ ok: true });
    expect(rendered.getState().isStale).toBe(true);

    rendered.rerenderWith({ enabled: false, requestKey: ["apiDataRequestTest", "other-account"] });

    expect(rendered.getState().data).toBeUndefined();
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

    const rendered = renderApiDataRequest(() => new Promise<{ ok: boolean }>(noop), cache);

    expect(rendered.getState().data).toEqual({ ok: true });
    expect(rendered.getState().isStale).toBe(true);
  });
});
