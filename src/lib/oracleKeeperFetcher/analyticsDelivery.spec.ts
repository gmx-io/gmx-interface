import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

import { OracleKeeperFetcher } from "./oracleKeeperFetcher";
import type { BatchReportBody } from "./types";

vi.mock("./OracleFallbackTracker", () => ({
  OracleKeeperFallbackTracker: class {
    startTracking = vi.fn();
    getCurrentEndpoints = () => ({ primary: "https://example.com", fallbacks: [] });
  },
}));
vi.mock("lib/metrics/oracleTrackerMetrics", () => ({ subscribeForOracleTrackerMetrics: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("analytics request delivery", () => {
  it.each([
    { size: "small", action: "RewardsPageView", keepalive: true },
    { size: "large", action: "界".repeat(22_000), keepalive: false },
  ])("handles a $size request without exceeding the keepalive byte limit", async ({ action, keepalive }) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const fetcher = new OracleKeeperFetcher({ chainId: ARBITRUM });
    const body: BatchReportBody = {
      items: [
        {
          type: "userAnalyticsEvent",
          payload: { event: "RewardsPageAction", distinctId: "visitor", customFields: { action } },
        },
      ],
    };

    await fetcher.fetchPostBatchReport(body);
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/report/ui/batch_report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive,
    });
  });
});
