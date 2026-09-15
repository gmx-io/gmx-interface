import { Window } from "happy-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAbFlags } from "config/ab";
import { UTM_PARAMS_KEY } from "config/localStorage";
import { captureUtmParams, getStoredUtmParams } from "domain/utm";
import { redirectLegacyHashUrl } from "lib/legacyHashUrl";
import { metrics } from "lib/metrics/Metrics";

import { initializeUserAnalytics } from "./initializeUserAnalytics";
import { getOrSetSessionId } from "./sessionId";
import { userAnalytics } from "./UserAnalytics";

vi.mock("lib/metrics/Metrics", () => ({ metrics: { pushBatchItem: vi.fn(), sendBatchItems: vi.fn() } }));

let browserWindow: Window;

function navigate(url: string) {
  browserWindow.happyDOM.setURL(url);
}

function sendView() {
  return userAnalytics.pushEvent<{ event: "RewardsPageAction"; data: { action: "RewardsPageView" } }>({
    event: "RewardsPageAction",
    data: { action: "RewardsPageView" },
  });
}

beforeEach(() => {
  browserWindow = new Window({ url: "https://preview.example/" });
  vi.stubGlobal("window", browserWindow);
  vi.stubGlobal("document", browserWindow.document);
  vi.stubGlobal("localStorage", browserWindow.localStorage);
  vi.clearAllMocks();
  userAnalytics.commonEventParams = { ...getAbFlags(), isTest: true, isInited: true };
  userAnalytics.earlyEventsQueue = [];
  userAnalytics.initCommonParamsRetries = 3;
  userAnalytics.isProcessingQueue = false;
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await browserWindow.happyDOM.close();
});

describe("analytics attribution", () => {
  it.each(["/", "/rewards", "/comeback", "/trade"])(
    "uses the forwarded identity for the first event and profile when entering %s",
    async (path) => {
      navigate(
        `https://preview.example${path}?sessionId=existing-user&utm_source=source&utm_medium=email&ref=Code#season`
      );
      initializeUserAnalytics();
      await sendView();
      userAnalytics.pushProfileProps({ languageCode: "en" });

      expect(metrics.pushBatchItem).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ payload: expect.objectContaining({ distinctId: "existing-user" }) })
      );
      expect(metrics.pushBatchItem).toHaveBeenNthCalledWith(2, {
        type: "userAnalyticsProfile",
        payload: {
          distinctId: "existing-user",
          customFields: { languageCode: "en", utm_source: "source", utm_medium: "email" },
        },
      });
      expect(window.location.pathname).toBe(path);
      expect(window.location.search).toBe("?utm_source=source&utm_medium=email&ref=Code");
      expect(window.location.hash).toBe("#season");
    }
  );

  it("retains a saved identity across revisits, conflicting links, and more than four days of inactivity", () => {
    localStorage.setItem("sessionId", "saved-user");
    localStorage.setItem("USER_ANALYTICS_LAST_EVENT_TIME", "1");
    navigate("https://preview.example/rewards?sessionId=other-user");
    initializeUserAnalytics();
    navigate("https://preview.example/");
    initializeUserAnalytics();
    expect(getOrSetSessionId()).toBe("saved-user");
  });

  it("preserves all saved UTM values and fills only missing tags", () => {
    navigate("https://preview.example/?utm_source=original&utm_medium=email&utm_campaign=season");
    initializeUserAnalytics();
    navigate("https://preview.example/rewards?utm_source=replacement&utm_term=trade&utm_content=banner");
    captureUtmParams();
    navigate("https://preview.example/builders");
    initializeUserAnalytics();
    userAnalytics.pushProfileProps({ languageCode: "en" });

    expect(metrics.pushBatchItem).toHaveBeenLastCalledWith({
      type: "userAnalyticsProfile",
      payload: {
        distinctId: getOrSetSessionId(),
        customFields: {
          languageCode: "en",
          utm_source: "original",
          utm_medium: "email",
          utm_campaign: "season",
          utm_term: "trade",
          utm_content: "banner",
        },
      },
    });
  });

  it("round-trips special characters through landing, rewards, and app links", () => {
    const campaign = "Season & rewards + #1/中文";
    navigate(`https://preview.example/?utm_campaign=${encodeURIComponent(campaign)}`);
    initializeUserAnalytics();
    const id = getOrSetSessionId();
    navigate("https://preview.example/rewards");
    initializeUserAnalytics();
    const params = userAnalytics.getSessionForwardParams();

    localStorage.clear();
    navigate(`https://app-preview.example/trade?${params}`);
    initializeUserAnalytics();
    expect(getOrSetSessionId()).toBe(id);
    expect(getStoredUtmParams()?.campaign).toBe(campaign);
    expect(new URLSearchParams(userAnalytics.getSessionForwardParams()).get("utm_campaign")).toBe(campaign);
  });

  it.each([
    ["https://gmx.io/rewards", "https://app.gmx.io/trade"],
    ["https://app.gmx.io/trade", "https://gmx.io/rewards"],
  ])("shares attribution from %s to %s even without forwarded parameters", (from, to) => {
    navigate(`${from}?utm_source=original&utm_medium=social`);
    initializeUserAnalytics();
    const id = getOrSetSessionId();

    localStorage.clear();
    localStorage.setItem("sessionId", "legacy-destination-user");
    navigate(`${to}?sessionId=conflicting-user&utm_source=other&utm_content=card`);
    initializeUserAnalytics();

    expect(getOrSetSessionId()).toBe(id);
    expect(getStoredUtmParams()).toMatchObject({ source: "original", medium: "social", content: "card" });
    expect(localStorage.getItem("sessionId")).toBe(id);

    localStorage.clear();
    navigate(from);
    initializeUserAnalytics();
    expect(getOrSetSessionId()).toBe(id);
    expect(getStoredUtmParams()).toMatchObject({ source: "original", medium: "social", content: "card" });
  });

  it("does not share attribution with unrelated domains", () => {
    navigate("https://gmx.io/?utm_source=original");
    initializeUserAnalytics();
    const id = getOrSetSessionId();
    localStorage.clear();
    navigate("https://notgmx.io/rewards");
    initializeUserAnalytics();
    expect(getOrSetSessionId()).not.toBe(id);
    expect(getStoredUtmParams()).toBeUndefined();
  });

  it("captures legacy hash links before a redirect discards the query", () => {
    navigate("https://preview.example/#/comeback?sessionId=legacy-user&utm_campaign=legacy");
    redirectLegacyHashUrl();
    initializeUserAnalytics();
    navigate("https://preview.example/rewards");
    expect(getOrSetSessionId()).toBe("legacy-user");
    expect(getStoredUtmParams()?.campaign).toBe("legacy");
  });

  it("recovers from malformed UTM storage and ignores empty or oversized query values", () => {
    localStorage.setItem(UTM_PARAMS_KEY, "not json");
    navigate(`https://preview.example/rewards?utm_source=&utm_medium=${"a".repeat(50)}&utm_campaign=valid`);
    initializeUserAnalytics();
    expect(getStoredUtmParams()).toEqual({ campaign: "valid", utmString: "utm_campaign=valid" });
  });

  it("flushes early events once with their original identity after common properties initialize", async () => {
    vi.useFakeTimers();
    navigate("https://preview.example/rewards?sessionId=forwarded-user");
    userAnalytics.commonEventParams.isInited = false;
    await sendView();
    await sendView();
    initializeUserAnalytics();
    userAnalytics.commonEventParams.isInited = true;
    await vi.advanceTimersByTimeAsync(2000);
    await userAnalytics.processQueue();

    expect(metrics.pushBatchItem).toHaveBeenCalledTimes(2);
    for (const [item] of vi.mocked(metrics.pushBatchItem).mock.calls) {
      expect(item.payload).toMatchObject({ distinctId: "forwarded-user", customFields: { isInited: true } });
    }
    expect(userAnalytics.earlyEventsQueue).toHaveLength(0);
  });
});
