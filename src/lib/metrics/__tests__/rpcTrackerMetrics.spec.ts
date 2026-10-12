import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitEndpointsUpdated } from "lib/FallbackTracker/events";
import { RpcTracker } from "lib/rpc/RpcTracker";

import { metrics } from "..";
import { subscribeForRpcTrackerMetrics } from "../rpcTrackerMetrics";

const TRACKER_KEY = "RpcTracker.test";
const A = "https://a.com";
const B = "https://b.com";
const C = "https://c.com";
const MINUTE = 60 * 1000;

const mockTracker = {
  trackerKey: TRACKER_KEY,
  params: { chainId: 42161 },
} as unknown as RpcTracker;

function readReports() {
  return metrics.queue.flatMap((item) => {
    if (item.type !== "event" || item.payload.event !== "rpcTracker.endpoint.updated") {
      return [];
    }

    const { primary, secondary, repeatCount, firstTs, lastTs } = item.payload.customFields;
    const pair = `${primary}/${secondary}`;

    return [repeatCount ? `${pair} x${repeatCount} ${firstTs}-${lastTs}` : pair];
  });
}

describe("subscribeForRpcTrackerMetrics", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    metrics.queue = [];
    cleanup = subscribeForRpcTrackerMetrics(mockTracker);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("reports new pairs at once and folds flapping between reported pairs into one summary per interval", () => {
    const updates: { time: number; primary: string; fallbacks: string[] }[] = [
      { time: 0, primary: A, fallbacks: [B, C] },
      // Only the tail changed
      { time: 10_000, primary: A, fallbacks: [B] },
      { time: 20_000, primary: B, fallbacks: [A] },
      // Back and forth between reported pairs, the summary is due 5 min after the first of them
      { time: 30_000, primary: A, fallbacks: [B] },
      { time: 40_000, primary: B, fallbacks: [A] },
      { time: 50_000, primary: A, fallbacks: [B] },
      // First switch after a quiet interval
      { time: 20 * MINUTE, primary: B, fallbacks: [A] },
      { time: 20 * MINUTE + 10_000, primary: A, fallbacks: [B] },
      // A new pair goes after the switch folded before it
      { time: 20 * MINUTE + 20_000, primary: C, fallbacks: [] },
    ];

    for (const { time, primary, fallbacks } of updates) {
      vi.advanceTimersByTime(time - Date.now());
      emitEndpointsUpdated({ trackerKey: TRACKER_KEY, primary, fallbacks, endpointsStats: [] });
    }

    expect(readReports()).toEqual([
      "a.com/b.com",
      "b.com/a.com",
      "a.com/b.com x3 30000-50000",
      "b.com/a.com",
      `a.com/b.com x1 ${20 * MINUTE + 10_000}-${20 * MINUTE + 10_000}`,
      "c.com/none",
    ]);
  });
});
