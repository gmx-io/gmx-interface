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
  metrics.globalMetricData.isInited = false;
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
  it("sends the first page view and UTM profile as soon as the fetcher is available", async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <LandingAnalytics />
        </MemoryRouter>
      </I18nProvider>
    );
    metrics.setFetcher({ fetchPostBatchReport: send } as unknown as OracleFetcher);
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].items).toEqual([
      {
        type: "userAnalyticsEvent",
        payload: {
          event: "RewardsLandingPageAction",
          distinctId: "visitor",
          customFields: expect.objectContaining({ action: "RewardsPageView", isTest: true, isInited: true }),
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
  });
});
