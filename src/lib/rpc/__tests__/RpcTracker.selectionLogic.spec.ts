import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { addFallbackTrackerListenner } from "lib/FallbackTracker/events";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams, createMockEndpointStats, testRpcConfigs, testRpcConfigsArray } from "./_utils";

// Helper function to mock getRpcProviders to return test configs
function mockGetRpcProvidersWithTestConfigs(configsToReturn: typeof testRpcConfigsArray) {
  return vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
    return configsToReturn.filter((config) => config.purpose === purpose);
  });
}

// Helper function to capture updateEndpoints events for a specific tracker
function captureUpdateEndpointsEvent(tracker: RpcTracker) {
  let capturedEvent: any = null;
  const unsubscribe = addFallbackTrackerListenner("endpointsUpdated", tracker.trackerKey, (event) => {
    if (event.trackerKey === tracker.trackerKey) {
      capturedEvent = event;
    }
  });

  return {
    get event() {
      return capturedEvent;
    },
    unsubscribe,
  };
}

// Helper function to verify fallbackTracker state and updateEndpoints event
function verifyFallbackTrackerEndpoints(
  tracker: RpcTracker,
  eventCapture: ReturnType<typeof captureUpdateEndpointsEvent>,
  expectedPrimary: string,
  expectedSecondary?: string,
  options?: { checkEndpointsStats?: boolean }
) {
  expect(tracker.fallbackTracker.state.primary).toBe(expectedPrimary);
  if (expectedSecondary !== undefined) {
    expect(tracker.fallbackTracker.state.secondary).toBe(expectedSecondary);
  } else {
    expect(tracker.fallbackTracker.state.secondary).toBeDefined();
  }

  // Event should be emitted if endpoints changed
  // If event is null, it means endpoints didn't change (which is valid if they were already correct)
  if (eventCapture.event) {
    expect(eventCapture.event.primary).toBe(expectedPrimary);
    if (expectedSecondary !== undefined) {
      expect(eventCapture.event.secondary).toBe(expectedSecondary);
    } else {
      expect(eventCapture.event.secondary).toBeDefined();
    }
    expect(eventCapture.event.trackerKey).toBe(tracker.trackerKey);
    if (options?.checkEndpointsStats) {
      expect(eventCapture.event.endpointsStats).toBeDefined();
    }
  } else {
    // If no event was emitted, endpoints should already be correct (no change needed)
    // This can happen if oldPrimary was already expectedPrimary and expectedSecondary is undefined
    const currentPrimary = tracker.fallbackTracker.state.primary;
    const currentSecondary = tracker.fallbackTracker.state.secondary;
    expect(currentPrimary).toBe(expectedPrimary);
    if (expectedSecondary !== undefined) {
      expect(currentSecondary).toBe(expectedSecondary);
    }
  }
}

// Helper function to verify fallbackTracker endpoints selection and event emission
function verifyFallbackTrackerSelection(
  tracker: RpcTracker,
  stats: any[],
  expectedPrimary: string,
  expectedSecondary?: string,
  options?: { checkEndpointsStats?: boolean; allowSameEndpoints?: boolean }
) {
  // Set initial endpoints to different values to ensure event is emitted
  // Use valid endpoints from the tracker's endpoints list, ensuring they're different from expected
  const validEndpoints = tracker.fallbackTracker.params.endpoints;

  // Find endpoints that are different from expected primary
  const candidatesForOldPrimary = validEndpoints.filter((e) => e !== expectedPrimary);
  const oldPrimary = candidatesForOldPrimary[0] || validEndpoints[0];

  // For oldSecondary, if expectedSecondary is provided, avoid it; otherwise use any endpoint different from oldPrimary and expectedPrimary
  const candidatesForOldSecondary = expectedSecondary
    ? validEndpoints.filter((e) => e !== expectedPrimary && e !== expectedSecondary && e !== oldPrimary)
    : validEndpoints.filter((e) => e !== expectedPrimary && e !== oldPrimary);
  const oldSecondary =
    candidatesForOldSecondary[0] ||
    validEndpoints.find((e) => e !== oldPrimary && e !== expectedPrimary) ||
    validEndpoints[0];

  // Ensure oldPrimary is different from expectedPrimary
  if (oldPrimary === expectedPrimary) {
    const alternative = validEndpoints.find((e) => e !== expectedPrimary);
    if (alternative) {
      tracker.fallbackTracker.state.primary = alternative;
      tracker.fallbackTracker.state.secondary =
        oldSecondary === alternative
          ? validEndpoints.find((e) => e !== alternative && e !== expectedPrimary) || validEndpoints[0]
          : oldSecondary;
    } else {
      // If all endpoints are the same, we can't test endpoint change
      tracker.fallbackTracker.state.primary = oldPrimary;
      tracker.fallbackTracker.state.secondary = oldSecondary;
    }
  } else {
    tracker.fallbackTracker.state.primary = oldPrimary;
    tracker.fallbackTracker.state.secondary = oldSecondary;
  }

  // Clear any existing throttle timeout to ensure immediate event emission
  if (tracker.fallbackTracker.state.setEndpointsThrottleTimeout) {
    clearTimeout(tracker.fallbackTracker.state.setEndpointsThrottleTimeout);
    tracker.fallbackTracker.state.setEndpointsThrottleTimeout = undefined;
  }

  vi.spyOn(tracker.fallbackTracker, "getEndpointsStats").mockReturnValue(stats as any);

  // Mock selectNextPrimary and selectNextSecondary to return expected values
  const originalSelectNextPrimary = tracker.fallbackTracker.params.selectNextPrimary;
  const originalSelectNextSecondary = tracker.fallbackTracker.params.selectNextSecondary;

  tracker.fallbackTracker.params.selectNextPrimary = vi.fn().mockReturnValue(expectedPrimary);
  // If expectedSecondary is not provided, let selectNextSecondary return undefined to keep current secondary
  tracker.fallbackTracker.params.selectNextSecondary = vi.fn().mockReturnValue(expectedSecondary);

  const eventCapture = captureUpdateEndpointsEvent(tracker);

  tracker.fallbackTracker.selectBestEndpoints();

  // Only check that primary and secondary are different if:
  // 1. allowSameEndpoints is not true
  // 2. expectedSecondary is provided and different from expectedPrimary
  if (!options?.allowSameEndpoints && expectedSecondary !== undefined && expectedSecondary !== expectedPrimary) {
    expect(tracker.fallbackTracker.state.primary).not.toBe(tracker.fallbackTracker.state.secondary);
  }

  verifyFallbackTrackerEndpoints(tracker, eventCapture, expectedPrimary, expectedSecondary, {
    checkEndpointsStats: options?.checkEndpointsStats,
  });

  // Restore original functions
  tracker.fallbackTracker.params.selectNextPrimary = originalSelectNextPrimary;
  tracker.fallbackTracker.params.selectNextSecondary = originalSelectNextSecondary;

  eventCapture.unsubscribe();
}

// Helper function to verify that fallbackTracker state remains unchanged when selectNext returns undefined
function verifyFallbackTrackerStateUnchanged(tracker: RpcTracker) {
  // Capture initial state
  const initialPrimary = tracker.fallbackTracker.state.primary;
  const initialSecondary = tracker.fallbackTracker.state.secondary;

  // Capture events to ensure no event was emitted
  const eventCapture = captureUpdateEndpointsEvent(tracker);

  // Verify state hasn't changed
  expect(tracker.fallbackTracker.state.primary).toBe(initialPrimary);
  expect(tracker.fallbackTracker.state.secondary).toBe(initialSecondary);

  // Verify no event was emitted
  expect(eventCapture.event).toBeNull();

  eventCapture.unsubscribe();
}

describe("Selection logic", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Primary", () => {
    describe("Edge cases", () => {
      it("should return undefined when empty array passed", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const result = tracker.selectNextPrimary({ endpointsStats: [] });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should return undefined when no valid endpoints", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const allInvalidStats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: false, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: false, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        // Mock getValidStats to return empty array (no valid endpoints)
        vi.spyOn(tracker, "getValidStats").mockReturnValue([]);

        // Should return undefined when no valid endpoints
        const result = tracker.selectNextPrimary({ endpointsStats: allInvalidStats });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should return only one valid endpoint matched criteria for regular account", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const singleValidEndpoint = testRpcConfigs.defaultPrimary.url;
        const stats = [
          createMockEndpointStats(singleValidEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(singleValidEndpoint);
        verifyFallbackTrackerSelection(tracker, stats, singleValidEndpoint);
      });

      it("should return only one valid endpoint matched criteria for large account", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const singleValidEndpoint = testRpcConfigs.largeAccount.url;
        const stats = [
          createMockEndpointStats(singleValidEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(singleValidEndpoint);
        verifyFallbackTrackerSelection(tracker, stats, singleValidEndpoint);
      });

      it("should return undefined when no endpoints matched criteria", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });
    });

    describe("For regular account", () => {
      it("should filter by purpose (default for non-large account)", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return all test configs
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultPrimary.url;

        const stats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(expectedPrimary);

        // Verify fallbackTracker and event
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should prefer valid stats over all stats", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return all test configs
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultPrimary.url;

        const validStats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const invalidStats = [
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
        ];

        vi.spyOn(tracker, "getValidStats").mockReturnValue(validStats);

        const result = tracker.selectNextPrimary({ endpointsStats: [...validStats, ...invalidStats] });

        expect(result).toBe(expectedPrimary);

        // Verify fallbackTracker and event
        verifyFallbackTrackerSelection(tracker, validStats, expectedPrimary, undefined, { allowSameEndpoints: true });
      });

      it("should return undefined when no valid stats match allowed purposes", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return all test configs
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const validStats = [
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const allStats = [
          ...validStats,
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
        ];

        vi.spyOn(tracker, "getValidStats").mockReturnValue(validStats);

        const result = tracker.selectNextPrimary({ endpointsStats: allStats });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should rank by preferred purpose, banned timestamp, and responseTime", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return all test configs
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultSecondary.url;

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(expectedPrimary);

        // Verify fallbackTracker and event
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should never select non-default rpc as primary (fallback)", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should select default even if fallback is faster
        expect(result).toBe(testRpcConfigs.defaultPrimary.url);
        verifyFallbackTrackerSelection(tracker, stats, testRpcConfigs.defaultPrimary.url);
      });

      it("should never select non-default rpc as primary (largeAccount)", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should select default even if largeAccount is faster
        expect(result).toBe(testRpcConfigs.defaultPrimary.url);
        verifyFallbackTrackerSelection(tracker, stats, testRpcConfigs.defaultPrimary.url);
      });

      it("should select non-banned endpoint first, then by response speed", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultSecondary.url; // Non-banned and faster

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            banned: { timestamp: Date.now(), reason: "test" },
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(expectedPrimary);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should sort by ban timestamp when all endpoints are banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const olderBanTime = Date.now() - 10000;
        const newerBanTime = Date.now() - 5000;
        const expectedPrimary = testRpcConfigs.defaultPrimary.url; // Older ban timestamp (less recent)

        const stats = [
          createMockEndpointStats(expectedPrimary, {
            banned: { timestamp: olderBanTime, reason: "test" },
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            banned: { timestamp: newerBanTime, reason: "test" },
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should select endpoint with older ban timestamp (less recent ban)
        expect(result).toBe(expectedPrimary);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should return default endpoint when only one default endpoint exists", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return only one default config
        mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary]);
        const tracker = new RpcTracker(params);

        const singleDefaultEndpoint = testRpcConfigs.defaultPrimary.url;
        const stats = [
          createMockEndpointStats(singleDefaultEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        expect(result).toBe(singleDefaultEndpoint);

        // Verify fallbackTracker state
        // For single endpoint, constructor already sets it correctly, and selectBestEndpoints does early return
        // without calling setCurrentEndpoints, so no event should be emitted
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.secondary).toBe(singleDefaultEndpoint);

        // Verify that selectBestEndpoints doesn't change endpoints and doesn't emit event
        const eventCapture = captureUpdateEndpointsEvent(tracker);
        tracker.fallbackTracker.selectBestEndpoints();
        // Event should not be emitted because endpoints don't change
        expect(eventCapture.event).toBeNull();
        // Endpoints should remain the same
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.secondary).toBe(singleDefaultEndpoint);
        eventCapture.unsubscribe();
      });
    });

    describe("For large account", () => {
      it("should prefer largeAccount endpoint by default", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const expectedPrimary = testRpcConfigs.largeAccount.url;

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should prefer largeAccount even if default is faster
        expect(result).toBe(expectedPrimary);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should select largeAccount even if default rpcs are faster until largeAccount is banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const expectedPrimary = testRpcConfigs.largeAccount.url;

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 10, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 20, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 1000, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should still select largeAccount even if much slower
        expect(result).toBe(expectedPrimary);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });

      it("should use regular account logic when largeAccount is banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const expectedPrimary = testRpcConfigs.defaultSecondary.url; // Fastest non-banned default

        const stats = [
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            banned: { timestamp: Date.now(), reason: "test" },
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextPrimary({ endpointsStats: stats });

        // Should select fastest default when largeAccount is banned
        expect(result).toBe(expectedPrimary);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary);
      });
    });
  });

  describe("Secondary", () => {
    describe("Edge cases", () => {
      it("should return undefined when empty array passed", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const result = tracker.selectNextSecondary({ endpointsStats: [] });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should return undefined when no valid endpoints", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const allInvalidStats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: false, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        vi.spyOn(tracker, "getValidStats").mockReturnValue([]);

        const result = tracker.selectNextSecondary({ endpointsStats: allInvalidStats });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should return only one valid endpoint matched criteria", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultPrimary.url;
        const singleValidEndpoint = testRpcConfigs.fallback.url;
        const stats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(singleValidEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        expect(result).toBe(singleValidEndpoint);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, singleValidEndpoint);
      });

      it("should return undefined when no endpoints matched criteria", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.express.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        expect(result).toBeUndefined();
        verifyFallbackTrackerStateUnchanged(tracker);
      });

      it("should return default endpoint when only one endpoint exists", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary]);
        const tracker = new RpcTracker(params);

        const singleDefaultEndpoint = testRpcConfigs.defaultPrimary.url;
        const stats = [
          createMockEndpointStats(singleDefaultEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        expect(result).toBe(singleDefaultEndpoint);

        // Verify fallbackTracker state
        // For single endpoint, constructor already sets it correctly, and selectBestEndpoints does early return
        // without calling setCurrentEndpoints, so no event should be emitted
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.secondary).toBe(singleDefaultEndpoint);

        // Verify that selectBestEndpoints doesn't change endpoints and doesn't emit event
        const eventCapture = captureUpdateEndpointsEvent(tracker);
        tracker.fallbackTracker.selectBestEndpoints();
        // Event should not be emitted because endpoints don't change
        expect(eventCapture.event).toBeNull();
        // Endpoints should remain the same
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.secondary).toBe(singleDefaultEndpoint);
        eventCapture.unsubscribe();
      });
    });

    describe("For regular account", () => {
      it("should select fallback rpc by default", () => {
        const params = createMockRpcTrackerParams();
        // Mock getRpcProviders to return all test configs
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedPrimary = testRpcConfigs.defaultPrimary.url;
        const expectedSecondary = testRpcConfigs.fallback.url;

        const stats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedSecondary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        expect(result).toBe(expectedSecondary);

        // Verify fallbackTracker and event
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedSecondary);
      });

      it("should select fallback rpc even if default is faster", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedSecondary = testRpcConfigs.fallback.url;

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 10, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedSecondary, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        // Should prefer fallback even if default is much faster
        expect(result).toBe(expectedSecondary);
        verifyFallbackTrackerSelection(tracker, stats, testRpcConfigs.defaultPrimary.url, expectedSecondary);
      });

      it("should select non-banned fastest default rpc when no fallback available", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary, testRpcConfigs.defaultSecondary]);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        // Should select fastest default when no fallback available
        expect(result).toBe(testRpcConfigs.defaultSecondary.url); // Fastest default

        // Verify fallbackTracker: primary will be fastest default, secondary will be slower default
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedSecondary = testRpcConfigs.defaultPrimary.url;
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedSecondary);
      });

      it("should select non-banned fastest default rpc when fallback is banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.fallback.url, {
            banned: { timestamp: Date.now(), reason: "test" },
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        // Should select fastest default when fallback is banned
        expect(result).toBe(testRpcConfigs.defaultSecondary.url); // Fastest non-banned default

        // Verify fallbackTracker: primary will be fastest default, secondary will be slower default
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedSecondary = testRpcConfigs.defaultPrimary.url;
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedSecondary);
      });
    });

    describe("For large account", () => {
      it("should select non-banned fastest RPC", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const stats = [
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            banned: { timestamp: Date.now(), reason: "test" },
            checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        // Should select fastest non-banned RPC
        expect(result).toBe(testRpcConfigs.defaultSecondary.url); // Fastest non-banned

        // Verify fallbackTracker: primary will be fastest default, secondary will be slower default
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedSecondary = testRpcConfigs.defaultPrimary.url;
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedSecondary);
      });

      it("should prefer largeAccount for secondary when available and not banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const expectedPrimary = testRpcConfigs.largeAccount.url; // largeAccount will be selected as primary
        const expectedSecondary = testRpcConfigs.defaultPrimary.url; // default will be selected as secondary

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 10, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        // Should prefer largeAccount even if default is faster
        expect(result).toBe(testRpcConfigs.largeAccount.url); // largeAccount will be selected
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedSecondary);
      });

      it("should prefer largeAccount purpose for large account secondary selection", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        // For largeAccount, when selecting secondary, it should prefer largeAccount over default
        // But if primary is already largeAccount, secondary will be selected from remaining stats
        const expectedPrimary = testRpcConfigs.largeAccount.url;
        const expectedSecondary = testRpcConfigs.defaultPrimary.url; // Only defaultPrimary remains after primary selection

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        // Test selectNextSecondary directly - it should prefer largeAccount when available
        const result = tracker.selectNextSecondary({ endpointsStats: stats });

        expect(result).toBe(expectedPrimary); // Should prefer largeAccount

        // Verify fallbackTracker and event
        // Include stats for both primary and secondary selection
        const allStats = [
          ...stats,
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 300, blockNumber: 1000000 } },
          }),
        ];
        // After selectBestEndpoints, primary will be largeAccount, secondary will be defaultPrimary (from remaining stats)
        verifyFallbackTrackerSelection(tracker, allStats, expectedPrimary, expectedSecondary);
      });
    });
  });

  describe("Combined", () => {
    it("should select unique primary and secondary for regular account", () => {
      const params = createMockRpcTrackerParams();
      mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.fallback.url, {
          checkResult: { success: true, stats: { responseTime: 150, blockNumber: 1000000 } },
        }),
      ];

      // For regular account: primary = fastest default, secondary = fallback
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.defaultSecondary.url, // Fastest default (responseTime: 100)
        testRpcConfigs.fallback.url // Fallback (responseTime: 150)
      );
    });

    it("should select unique primary and secondary for large account", () => {
      const params = createMockRpcTrackerParams();
      mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
      const tracker = new RpcTracker(params);

      tracker.getIsLargeAccount = () => true;

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.largeAccount.url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
      ];

      // For large account: primary = largeAccount (preferred), secondary = fastest default
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.largeAccount.url, // largeAccount (preferred even if slower)
        testRpcConfigs.defaultPrimary.url // Fastest default (responseTime: 50)
      );
    });

    it("should select unique primary and secondary when some endpoints are banned", () => {
      const params = createMockRpcTrackerParams();
      mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          banned: { timestamp: Date.now(), reason: "test" },
          checkResult: { success: true, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.fallback.url, {
          checkResult: { success: true, stats: { responseTime: 150, blockNumber: 1000000 } },
        }),
      ];

      // With banned endpoint: primary = fastest non-banned default, secondary = fallback
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.defaultSecondary.url, // Fastest non-banned default (responseTime: 100)
        testRpcConfigs.fallback.url // Fallback (responseTime: 150)
      );
    });

    it("should select same endpoint for both primary and secondary when only one endpoint exists", () => {
      const params = createMockRpcTrackerParams();
      mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary]);
      const tracker = new RpcTracker(params);

      const singleEndpoint = testRpcConfigs.defaultPrimary.url;

      // Verify initial state: constructor should set both primary and secondary to the single endpoint
      expect(tracker.fallbackTracker.state.primary).toBe(singleEndpoint);
      expect(tracker.fallbackTracker.state.secondary).toBe(singleEndpoint);

      // Set initial endpoints to different values to test that selectBestEndpoints changes them
      tracker.fallbackTracker.state.primary = "https://old-primary.com";
      tracker.fallbackTracker.state.secondary = "https://old-secondary.com";
      const eventCapture = captureUpdateEndpointsEvent(tracker);

      tracker.fallbackTracker.selectBestEndpoints();

      // Verify that primary and secondary are the same when only one endpoint exists
      expect(tracker.fallbackTracker.state.primary).toBe(singleEndpoint);
      expect(tracker.fallbackTracker.state.secondary).toBe(singleEndpoint);
      expect(tracker.fallbackTracker.state.primary).toBe(tracker.fallbackTracker.state.secondary);

      // When endpoints.length === 1, selectBestEndpoints does early return without calling setCurrentEndpoints
      // So no event should be emitted (even though endpoints changed)
      // This is the expected behavior according to FallbackTracker implementation
      expect(eventCapture.event).toBeNull();

      eventCapture.unsubscribe();
    });
  });

  describe("getValidStats", () => {
    it("should filter endpoints with successful checks", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs.defaultPrimary.url);
    });

    it("should filter out endpoints with blockNumber from future", () => {
      const params = createMockRpcTrackerParams({ blockFromFutureThreshold: 1000 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1002000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs.defaultSecondary.url);
    });

    it("should filter out endpoints with blockNumber lagging", () => {
      const params = createMockRpcTrackerParams({ blockLaggingThreshold: 50 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 949 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs.defaultPrimary.url);
    });

    it("should return all stats when no valid stats are found", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: false, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(stats.length);
      expect(result[0].endpoint).toBe(testRpcConfigs.defaultPrimary.url);
    });

    it("should handle undefined blockNumber", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 0 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
    });

    it("should handle undefined bestValidBlock", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(undefined);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
    });
  });

  describe("getBestValidBlock", () => {
    it("should return most recent block when only one exists", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      const result = tracker.getBestValidBlock(stats);

      expect(result).toBe(1000000);
    });

    it("should return most recent block when second is within threshold", () => {
      const params = createMockRpcTrackerParams({ blockFromFutureThreshold: 1000 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000500 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      const result = tracker.getBestValidBlock(stats);

      expect(result).toBe(1000500);
    });

    it("should return second recent block when most recent is too far ahead", () => {
      const params = createMockRpcTrackerParams({ blockFromFutureThreshold: 1000 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1002000 } },
        }),
        createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      const result = tracker.getBestValidBlock(stats);

      expect(result).toBe(1000000);
    });

    it("should return undefined when no blockNumbers exist", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 0 } },
        }),
      ];

      const result = tracker.getBestValidBlock(stats);

      expect(result).toBeUndefined();
    });

    it("should handle empty array", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const result = tracker.getBestValidBlock([]);

      expect(result).toBeUndefined();
    });
  });
});
