import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics } from "lib/metrics/Metrics";
import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";
import { initializeUserAnalytics } from "lib/userAnalytics/initializeUserAnalytics";
import { sendRewardsLandingEvent } from "lib/userAnalytics/rewardsLandingEvents";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState({}, "", "/rewards?sessionId=visitor&utm_medium=email");
  initializeUserAnalytics();
  metrics.queue = [];
  metrics.fetcher = undefined;
  metrics.isProcessing = false;
  metrics.globalMetricData = { ...metrics.globalMetricData, isInited: false, isHomeSite: false };
  metrics.wallets = undefined;
  metrics.isGlobalPropsFilled = false;
  metrics.initGlobalPropsRetries = 3;
  userAnalytics.commonEventParams.isInited = false;
  userAnalytics.earlyEventsQueue = [];
  userAnalytics.initCommonParamsRetries = 3;
  userAnalytics.isProcessingQueue = false;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("landing analytics delivery", () => {
  it("queues an immediate page view when a redirect runs before the fetcher is ready", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    userAnalytics.setCommonEventParams({ ...userAnalytics.commonEventParams, isInited: true });
    metrics.setGlobalMetricData({ isInited: true, isHomeSite: true });

    await expect(sendRewardsLandingEvent({ action: "RewardsPageView" })).resolves.toBeUndefined();

    metrics.setFetcher({ fetchPostBatchReport: send } as unknown as OracleFetcher);
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].items).toEqual([
      expect.objectContaining({
        type: "userAnalyticsEvent",
        payload: expect.objectContaining({
          event: "RewardsLandingPageAction",
          customFields: expect.objectContaining({ action: "RewardsPageView" }),
        }),
      }),
    ]);
  });
});
