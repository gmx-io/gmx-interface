import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProviderNameFromUrl } from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { METRIC_EVENT_DISPATCH_NAME } from "lib/metrics/emitMetricEvent";

import { RpcTracker } from "../RpcTracker";
import { createMockEndpointStats, createMockRpcCheckResult, createMockRpcTrackerParams } from "./_utils";

describe("RpcTracker - metrics", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("banEndpoint metric", () => {
    it("should emit fallbackTracker.endpoint.banned event with correct data", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const primaryUrl = tracker.fallbackTracker.state.primary;
      const expectedProviderName = getProviderNameFromUrl(primaryUrl);
      const reason = "Banned by failures threshold";

      const capturedEvents: CustomEvent[] = [];
      const eventListener = (event: Event) => {
        capturedEvents.push(event as CustomEvent);
      };

      globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      tracker.banEndpoint(primaryUrl, reason);

      globalThis.removeEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      const banEvent = capturedEvents.find((e) => e.detail?.event === "fallbackTracker.endpoint.banned");

      expect(banEvent).toBeDefined();
      expect(banEvent?.detail?.event).toBe("fallbackTracker.endpoint.banned");
      expect(banEvent?.detail?.isError).toBe(false);
      expect(banEvent?.detail?.data?.endpoint).toBe(expectedProviderName);
      expect(banEvent?.detail?.data?.endpoint).not.toBe(primaryUrl);
      expect(banEvent?.detail?.data?.reason).toBe(reason);
      expect(banEvent?.detail?.data?.key).toBe(tracker.fallbackTracker.trackerKey);
    });
  });

  describe("updateEndpoints metric", () => {
    it("should emit rpcTracker.updateEndpoints event with correct data including provider names and block gaps", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const primaryUrl = "https://arb-mainnet.g.alchemy.com/v2/test-key";
      const secondaryUrl = "https://rpc.ankr.com/arbitrum";
      const expectedPrimaryName = "arb-mainnet.g.alchemy.com";
      const expectedSecondaryName = "rpc.ankr.com/arbitrum";
      const bestBlock = 1000000;

      const endpointsStats = [
        createMockEndpointStats(primaryUrl, {
          checkResult: {
            success: true,
            stats: createMockRpcCheckResult({ blockNumber: bestBlock }),
          },
        }),
        createMockEndpointStats(secondaryUrl, {
          checkResult: {
            success: true,
            stats: createMockRpcCheckResult({ blockNumber: bestBlock - 10 }),
          },
        }),
      ];

      const capturedEvents: CustomEvent[] = [];
      const eventListener = (event: Event) => {
        capturedEvents.push(event as CustomEvent);
      };

      globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      tracker.emitUpdateEndpointsMetric({
        primary: primaryUrl,
        secondary: secondaryUrl,
        endpointsStats,
      });

      globalThis.removeEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      const updateEvent = capturedEvents.find((e) => e.detail?.event === "rpcTracker.updateEndpoints");

      expect(updateEvent).toBeDefined();
      expect(updateEvent?.detail?.event).toBe("rpcTracker.updateEndpoints");
      expect(updateEvent?.detail?.isError).toBe(false);
      expect(updateEvent?.detail?.data?.primary).toBe(expectedPrimaryName);
      expect(updateEvent?.detail?.data?.secondary).toBe(expectedSecondaryName);
      expect(updateEvent?.detail?.data?.chainName).toBeDefined();
      expect(updateEvent?.detail?.data?.primaryBlockGap).toBe(0);
      expect(updateEvent?.detail?.data?.secondaryBlockGap).toBe(10);
    });

    it("should set block gaps to 'unknown' when block numbers are not available", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const primaryUrl = "https://primary-rpc.com";
      const secondaryUrl = "https://secondary-rpc.com";

      const endpointsStats = [
        createMockEndpointStats(primaryUrl, {
          checkResult: {
            success: true,
            stats: createMockRpcCheckResult({ blockNumber: undefined }),
          },
        }),
        createMockEndpointStats(secondaryUrl, {
          checkResult: {
            success: true,
            stats: createMockRpcCheckResult({ blockNumber: undefined }),
          },
        }),
      ];

      const capturedEvents: CustomEvent[] = [];
      const eventListener = (event: Event) => {
        capturedEvents.push(event as CustomEvent);
      };

      globalThis.addEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      tracker.emitUpdateEndpointsMetric({
        primary: primaryUrl,
        secondary: secondaryUrl,
        endpointsStats,
      });

      globalThis.removeEventListener(METRIC_EVENT_DISPATCH_NAME, eventListener);

      const updateEvent = capturedEvents.find((e) => e.detail?.event === "rpcTracker.updateEndpoints");

      expect(updateEvent).toBeDefined();
      expect(updateEvent?.detail?.data?.primaryBlockGap).toBe("unknown");
      expect(updateEvent?.detail?.data?.secondaryBlockGap).toBe("unknown");
    });
  });
});
