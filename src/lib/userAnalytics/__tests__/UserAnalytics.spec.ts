import { afterEach, describe, expect, it, vi } from "vitest";

import type { UserAnalyticsEventItem } from "lib/oracleKeeperFetcher";

import { userAnalytics } from "../UserAnalytics";

const { sendBatchItems } = vi.hoisted(() => ({ sendBatchItems: vi.fn() }));

vi.mock("../../metrics/Metrics", () => ({
  metrics: { sendBatchItems, pushBatchItem: vi.fn() },
}));

describe("UserAnalytics", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the events from before the common params once, also when the analytics request fails TRD-164", async () => {
    vi.useFakeTimers();
    sendBatchItems.mockRejectedValue(new Error("Failed to fetch"));

    userAnalytics.pushEvent({ event: "NotificationsAction", data: { action: "DailyState" } });
    userAnalytics.pushEvent({ event: "NotificationsAction", data: { action: "Tap" } });
    userAnalytics.setCommonEventParams({
      ...userAnalytics.commonEventParams,
      isInited: true,
    });
    await vi.advanceTimersByTimeAsync(2000);

    expect(sendBatchItems).toHaveBeenCalledOnce();
    expect(
      sendBatchItems.mock.calls[0][0].map((item: UserAnalyticsEventItem) => item.payload.customFields.action)
    ).toEqual(["DailyState", "Tap"]);
  });
});
