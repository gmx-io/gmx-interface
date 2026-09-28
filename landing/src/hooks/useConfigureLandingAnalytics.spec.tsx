import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics } from "lib/metrics/Metrics";
import type { OracleFetcher } from "lib/oracleKeeperFetcher/types";
import { initializeUserAnalytics } from "lib/userAnalytics/initializeUserAnalytics";
import { sendRewardsLandingEvent } from "lib/userAnalytics/rewardsLandingEvents";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { useConfigureLandingAnalytics } from "./useConfigureLandingAnalytics";

vi.mock("lib/useBowser", () => ({ useBowser: () => ({ data: undefined }) }));

function RewardsView() {
  useEffect(() => {
    sendRewardsLandingEvent({ action: "RewardsPageView" });
  }, []);
  return null;
}

function LandingAnalytics() {
  useConfigureLandingAnalytics();
  return <RewardsView />;
}

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
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
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

  it.each(["before", "after"])(
    "delivers the page view and UTM profile with the fetcher ready %s mount",
    async (order) => {
      const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const fetcher = { fetchPostBatchReport: send } as unknown as OracleFetcher;
      if (order === "before") metrics.setFetcher(fetcher);

      render(
        <I18nProvider i18n={i18n}>
          <MemoryRouter>
            <LandingAnalytics />
          </MemoryRouter>
        </I18nProvider>
      );
      if (order === "after") metrics.setFetcher(fetcher);
      await vi.advanceTimersByTimeAsync(3000);

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].items).toEqual([
        {
          type: "userAnalyticsEvent",
          payload: {
            event: "RewardsLandingPageAction",
            distinctId: "visitor",
            customFields: expect.objectContaining({
              action: "RewardsPageView",
              displayMode: "browser",
              isTest: true,
              isInited: true,
            }),
          },
        },
        {
          type: "userAnalyticsProfile",
          payload: { distinctId: "visitor", customFields: { languageCode: "en", ref: undefined, utm_medium: "email" } },
        },
      ]);

      await vi.advanceTimersByTimeAsync(2000);
      expect(send).toHaveBeenCalledOnce();
      expect(userAnalytics.earlyEventsQueue).toHaveLength(0);
    }
  );

  it("delivers a new profile promptly after a long period without events", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    metrics.setGlobalMetricData({ isInited: true, isHomeSite: true });
    userAnalytics.pushProfileProps({ languageCode: "en" });
    metrics.setFetcher({ fetchPostBatchReport: send } as unknown as OracleFetcher);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(send).toHaveBeenCalledOnce();

    userAnalytics.pushProfileProps({ languageCode: "es" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].items).toEqual([
      {
        type: "userAnalyticsProfile",
        payload: { distinctId: "visitor", customFields: { languageCode: "es", utm_medium: "email" } },
      },
    ]);
  });
});
