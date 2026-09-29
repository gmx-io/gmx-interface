import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BatchReportItem, OracleFetcher } from "lib/oracleKeeperFetcher/types";

import { metrics } from "./Metrics";

const firstItem: BatchReportItem = {
  type: "userAnalyticsProfile",
  payload: { distinctId: "visitor", customFields: { languageCode: "en" } },
};
const secondItem: BatchReportItem = {
  type: "userAnalyticsProfile",
  payload: { distinctId: "visitor", customFields: { languageCode: "es" } },
};

beforeEach(() => {
  vi.useFakeTimers();
  metrics.queue = [];
  metrics.fetcher = undefined;
  metrics.isProcessing = false;
  metrics.isGlobalPropsFilled = false;
  metrics.initGlobalPropsRetries = 3;
  metrics.wallets = undefined;
  metrics.setGlobalMetricData({ isInited: true, isHomeSite: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("metrics queue delivery", () => {
  it("keeps one worker when the fetcher is set again during an in-flight batch", async () => {
    let complete!: (response: Response) => void;
    const send = vi.fn<OracleFetcher["fetchPostBatchReport"]>().mockResolvedValue(new Response(null));
    send.mockImplementationOnce(() => new Promise((resolve) => (complete = resolve)));
    const fetcher = { fetchPostBatchReport: send } as unknown as OracleFetcher;
    metrics.setFetcher(fetcher);
    metrics.pushBatchItem(firstItem);
    await vi.advanceTimersByTimeAsync(3000);

    metrics.setFetcher(fetcher);
    metrics.pushBatchItem(secondItem);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].items).toEqual([firstItem]);

    complete(new Response(null));
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].items).toEqual([secondItem]);
    expect(metrics.queue).toEqual([]);
  });

  it.each(["network", "server"])("retries a %s failure without losing later queued items", async (failure) => {
    const send = vi.fn<OracleFetcher["fetchPostBatchReport"]>().mockResolvedValue(new Response(null));
    if (failure === "network") send.mockRejectedValueOnce(new Error("Network unavailable"));
    else send.mockResolvedValueOnce(new Response(null, { status: 500 }));
    metrics.setFetcher({ fetchPostBatchReport: send } as unknown as OracleFetcher);
    metrics.pushBatchItem(firstItem);
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenCalledOnce();

    metrics.pushBatchItem(secondItem);
    await vi.advanceTimersByTimeAsync(2999);
    expect(send).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].items).toEqual([firstItem, secondItem]);

    await vi.advanceTimersByTimeAsync(12_000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(metrics.queue).toEqual([]);
  });

  it("still waits for wallet metadata in the main app before delivering an early metric", async () => {
    const send = vi.fn<OracleFetcher["fetchPostBatchReport"]>().mockResolvedValue(new Response(null));
    metrics.setGlobalMetricData({ isHomeSite: false });
    metrics.setFetcher({ fetchPostBatchReport: send } as unknown as OracleFetcher);
    metrics.pushEvent({ event: "app.startup" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).not.toHaveBeenCalled();

    metrics.wallets = { current: null, authorized: [], error: false };
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].items).toEqual([
      expect.objectContaining({
        type: "event",
        payload: expect.objectContaining({
          event: "app.startup",
          customFields: expect.objectContaining({ isHomeSite: false, wallets: metrics.wallets }),
        }),
      }),
    ]);
  });
});
