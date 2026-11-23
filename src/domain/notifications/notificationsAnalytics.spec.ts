import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendNotificationsDailyStateEvent } from "./notificationsAnalytics";

const { pushEvent } = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: { pushEvent, getIsCommonParamsInited: () => true },
}));

describe("sendNotificationsDailyStateEvent", () => {
  beforeEach(() => {
    localStorage.clear();
    pushEvent.mockReset().mockResolvedValue(undefined);

    // jsdom has no Web Locks: requests for a name run one after another, like across the tabs of one origin.
    let lockTail: Promise<unknown> = Promise.resolve();
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_name: string, callback: () => Promise<unknown>) => {
          const result = lockTail.then(callback);
          lockTail = result.catch(() => undefined);
          return result;
        },
      },
    });
  });

  afterEach(() => {
    delete (navigator as { locks?: unknown }).locks;
  });

  it("sends one DailyState when two tabs open at the same time", async () => {
    await Promise.all([sendNotificationsDailyStateEvent("on"), sendNotificationsDailyStateEvent("on")]);

    expect(pushEvent).toHaveBeenCalledOnce();
  });
});
