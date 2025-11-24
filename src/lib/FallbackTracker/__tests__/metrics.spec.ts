import { beforeEach, describe, expect, it } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";
import { METRIC_EVENT_DISPATCH_NAME } from "lib/metrics/emitMetricEvent";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig } from "./_utils";

describe("FallbackTracker - metrics", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
  });

  describe("banEndpoint metric", () => {
    it("should emit fallbackTracker.endpoint.banned event with correct data", () => {
      const config = createMockConfig({
        getEndpointName: (endpoint: string) => {
          const url = new URL(endpoint);
          return url.hostname;
        },
      });
      const tracker = new FallbackTracker(config);

      const endpoint = config.primary;
      const expectedEndpointName = new URL(endpoint).hostname;
      const reason = "Banned by failures threshold";

      const capturedEvents: CustomEvent[] = [];
      const eventListener = (event: Event) => {
        capturedEvents.push(event as CustomEvent);
      };

      globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      tracker.banEndpoint(endpoint, reason);

      globalThis.removeEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      const banEvent = capturedEvents.find((e) => e.detail?.event === "fallbackTracker.endpoint.banned");

      expect(banEvent).toBeDefined();
      expect(banEvent?.detail?.event).toBe("fallbackTracker.endpoint.banned");
      expect(banEvent?.detail?.isError).toBe(false);
      expect(banEvent?.detail?.data?.endpoint).toBe(expectedEndpointName);
      expect(banEvent?.detail?.data?.endpoint).not.toBe(endpoint);
      expect(banEvent?.detail?.data?.reason).toBe(reason);
      expect(banEvent?.detail?.data?.key).toBe(tracker.trackerKey);
    });

    it("should fallback to endpoint URL if getEndpointName is not provided", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const endpoint = config.primary;
      const reason = "Test ban reason";

      const capturedEvents: CustomEvent[] = [];
      const eventListener = (event: Event) => {
        capturedEvents.push(event as CustomEvent);
      };

      globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      tracker.banEndpoint(endpoint, reason);

      globalThis.removeEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      const banEvent = capturedEvents.find((e) => e.detail?.event === "fallbackTracker.endpoint.banned");

      expect(banEvent).toBeDefined();
      expect(banEvent?.detail?.data?.endpoint).toBe(endpoint);
      expect(banEvent?.detail?.data?.key).toBe(tracker.trackerKey);
    });
  });
});
