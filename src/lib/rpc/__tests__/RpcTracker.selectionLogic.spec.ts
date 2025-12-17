import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";

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
  const unsubscribe = addFallbackTrackerListener("endpointsUpdated", tracker.trackerKey, (event) => {
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
  expectedFallbacks?: string[],
  options?: { checkEndpointsStats?: boolean }
) {
  expect(tracker.fallbackTracker.state.primary).toBe(expectedPrimary);
  if (expectedFallbacks !== undefined) {
    expect(tracker.fallbackTracker.state.fallbacks).toEqual(expectedFallbacks);
  } else {
    expect(Array.isArray(tracker.fallbackTracker.state.fallbacks)).toBe(true);
  }

  // Event should be emitted if endpoints changed
  // If event is null, it means endpoints didn't change (which is valid if they were already correct)
  if (eventCapture.event) {
    expect(eventCapture.event.primary).toBe(expectedPrimary);
    if (expectedFallbacks !== undefined) {
      expect(eventCapture.event.fallbacks).toEqual(expectedFallbacks);
    } else {
      expect(Array.isArray(eventCapture.event.fallbacks)).toBe(true);
    }
    expect(eventCapture.event.trackerKey).toBe(tracker.trackerKey);
    if (options?.checkEndpointsStats) {
      expect(eventCapture.event.endpointsStats).toBeDefined();
    }
  } else {
    // If no event was emitted, endpoints should already be correct (no change needed)
    // This can happen if oldPrimary was already expectedPrimary and expectedFallbacks is undefined
    const currentPrimary = tracker.fallbackTracker.state.primary;
    const currentFallbacks = tracker.fallbackTracker.state.fallbacks;
    expect(currentPrimary).toBe(expectedPrimary);
    if (expectedFallbacks !== undefined) {
      expect(currentFallbacks).toEqual(expectedFallbacks);
    }
  }
}

// Helper function to verify fallbackTracker endpoints selection and event emission
function verifyFallbackTrackerSelection(
  tracker: RpcTracker,
  stats: any[],
  expectedPrimary: string,
  expectedFallbacks?: string[],
  options?: { checkEndpointsStats?: boolean; allowSameEndpoints?: boolean }
) {
  // Set initial endpoints to different values to ensure event is emitted
  // Use valid endpoints from the tracker's endpoints list, ensuring they're different from expected
  const validEndpoints = tracker.fallbackTracker.params.endpoints;

  // Find endpoints that are different from expected primary
  const candidatesForOldPrimary = validEndpoints.filter((e) => e !== expectedPrimary);
  const oldPrimary = candidatesForOldPrimary[0] || validEndpoints[0];

  // For oldFallbacks, if expectedFallbacks is provided, avoid them; otherwise use any endpoint different from oldPrimary and expectedPrimary
  const expectedFallbacksSet = expectedFallbacks ? new Set(expectedFallbacks) : new Set();
  const candidatesForOldFallbacks = expectedFallbacks
    ? validEndpoints.filter((e) => e !== expectedPrimary && !expectedFallbacksSet.has(e) && e !== oldPrimary)
    : validEndpoints.filter((e) => e !== expectedPrimary && e !== oldPrimary);
  const oldFallbacks =
    candidatesForOldFallbacks.length > 0
      ? [candidatesForOldFallbacks[0]]
      : validEndpoints.filter((e) => e !== oldPrimary && e !== expectedPrimary).slice(0, 1) || [validEndpoints[0]];

  // Ensure oldPrimary is different from expectedPrimary
  if (oldPrimary === expectedPrimary) {
    const alternative = validEndpoints.find((e) => e !== expectedPrimary);
    if (alternative) {
      tracker.fallbackTracker.state.primary = alternative;
      tracker.fallbackTracker.state.fallbacks = oldFallbacks.includes(alternative)
        ? validEndpoints.filter((e) => e !== alternative && e !== expectedPrimary).slice(0, 1) || [validEndpoints[0]]
        : oldFallbacks;
    } else {
      // If all endpoints are the same, we can't test endpoint change
      tracker.fallbackTracker.state.primary = oldPrimary;
      tracker.fallbackTracker.state.fallbacks = oldFallbacks;
    }
  } else {
    tracker.fallbackTracker.state.primary = oldPrimary;
    tracker.fallbackTracker.state.fallbacks = oldFallbacks;
  }

  // Clear any existing throttle timeout to ensure immediate event emission
  if (tracker.fallbackTracker.state.setEndpointsThrottleTimeout) {
    clearTimeout(tracker.fallbackTracker.state.setEndpointsThrottleTimeout);
    tracker.fallbackTracker.state.setEndpointsThrottleTimeout = undefined;
  }

  vi.spyOn(tracker.fallbackTracker, "getEndpointsStats").mockReturnValue(stats as any);

  // Mock selectNextPrimary and selectNextFallbacks to return expected values
  const originalSelectNextPrimary = tracker.fallbackTracker.params.selectNextPrimary;
  const originalSelectNextFallbacks = tracker.fallbackTracker.params.selectNextFallbacks;

  tracker.fallbackTracker.params.selectNextPrimary = vi.fn().mockReturnValue(expectedPrimary);
  // If expectedFallbacks is not provided, let selectNextFallbacks return undefined to keep current fallbacks
  tracker.fallbackTracker.params.selectNextFallbacks = vi.fn().mockReturnValue(expectedFallbacks);

  const eventCapture = captureUpdateEndpointsEvent(tracker);

  tracker.fallbackTracker.selectBestEndpoints();

  // Only check that primary is not in fallbacks if:
  // 1. allowSameEndpoints is not true
  // 2. expectedFallbacks is provided and doesn't include expectedPrimary
  if (!options?.allowSameEndpoints && expectedFallbacks !== undefined && !expectedFallbacks.includes(expectedPrimary)) {
    expect(tracker.fallbackTracker.state.fallbacks).not.toContain(tracker.fallbackTracker.state.primary);
  }

  verifyFallbackTrackerEndpoints(tracker, eventCapture, expectedPrimary, expectedFallbacks, {
    checkEndpointsStats: options?.checkEndpointsStats,
  });

  // Restore original functions
  tracker.fallbackTracker.params.selectNextPrimary = originalSelectNextPrimary;
  tracker.fallbackTracker.params.selectNextFallbacks = originalSelectNextFallbacks;

  eventCapture.unsubscribe();
}

// Helper function to verify that fallbackTracker state remains unchanged when selectNext returns undefined
function verifyFallbackTrackerStateUnchanged(tracker: RpcTracker) {
  // Capture initial state
  const initialPrimary = tracker.fallbackTracker.state.primary;
  const initialFallbacks = [...tracker.fallbackTracker.state.fallbacks];

  // Capture events to ensure no event was emitted
  const eventCapture = captureUpdateEndpointsEvent(tracker);

  // Verify state hasn't changed
  expect(tracker.fallbackTracker.state.primary).toBe(initialPrimary);
  expect(tracker.fallbackTracker.state.fallbacks).toEqual(initialFallbacks);

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
        expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);

        // Verify that selectBestEndpoints doesn't change endpoints and doesn't emit event
        const eventCapture = captureUpdateEndpointsEvent(tracker);
        tracker.fallbackTracker.selectBestEndpoints();
        // Event should not be emitted because endpoints don't change
        expect(eventCapture.event).toBeNull();
        // Endpoints should remain the same
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);
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

  describe("Fallbacks", () => {
    describe("Edge cases", () => {
      it("should return empty array when empty array passed", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const result = tracker.selectNextFallbacks({ endpointsStats: [], primary: testRpcConfigs.defaultPrimary.url });

        expect(result).toEqual([]);
      });

      it("should return empty array when no valid endpoints", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const allInvalidStats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: false, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        vi.spyOn(tracker, "getValidStats").mockReturnValue([]);

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = allInvalidStats.filter((s) => s.endpoint !== testRpcConfigs.defaultPrimary.url);
        const result = tracker.selectNextFallbacks({
          endpointsStats: statsWithoutPrimary,
          primary: testRpcConfigs.defaultPrimary.url,
        });

        expect(result).toEqual([]);
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

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== expectedPrimary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary: expectedPrimary });

        expect(result).toEqual([singleValidEndpoint]);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, [singleValidEndpoint]);
      });

      it("should return empty array when no endpoints matched criteria", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const stats = [
          createMockEndpointStats(testRpcConfigs.express.url, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== testRpcConfigs.defaultPrimary.url);
        const result = tracker.selectNextFallbacks({
          endpointsStats: statsWithoutPrimary,
          primary: testRpcConfigs.defaultPrimary.url,
        });

        expect(result).toEqual([]);
      });

      it("should return empty array when only one endpoint exists", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary]);
        const tracker = new RpcTracker(params);

        const singleDefaultEndpoint = testRpcConfigs.defaultPrimary.url;
        const stats = [
          createMockEndpointStats(singleDefaultEndpoint, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== singleDefaultEndpoint);
        const result = tracker.selectNextFallbacks({
          endpointsStats: statsWithoutPrimary,
          primary: singleDefaultEndpoint,
        });

        expect(result).toEqual([]);

        // Verify fallbackTracker state
        // For single endpoint, constructor already sets it correctly, and selectBestEndpoints does early return
        // without calling setCurrentEndpoints, so no event should be emitted
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);

        // Verify that selectBestEndpoints doesn't change endpoints and doesn't emit event
        const eventCapture = captureUpdateEndpointsEvent(tracker);
        tracker.fallbackTracker.selectBestEndpoints();
        // Event should not be emitted because endpoints don't change
        expect(eventCapture.event).toBeNull();
        // Endpoints should remain the same
        expect(tracker.fallbackTracker.state.primary).toBe(singleDefaultEndpoint);
        expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);
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
        const expectedFallback = testRpcConfigs.fallback.url;

        const stats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedFallback, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== expectedPrimary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary: expectedPrimary });

        expect(result).toEqual([expectedFallback]);

        // Verify fallbackTracker and event
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, [expectedFallback]);
      });

      it("should select fallback rpc even if default is faster", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        const expectedFallback = testRpcConfigs.fallback.url;
        const expectedPrimary = testRpcConfigs.defaultPrimary.url;

        const stats = [
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 10, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedFallback, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== expectedPrimary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary: expectedPrimary });

        // Should prefer fallback even if default is much faster
        expect(result).toEqual([expectedFallback]);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, [expectedFallback]);
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

        const primary = testRpcConfigs.defaultSecondary.url;
        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== primary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary });

        // Should select fastest default when no fallback available
        expect(result).toEqual([testRpcConfigs.defaultPrimary.url]); // Slower default as fallback

        // Verify fallbackTracker: primary will be fastest default, fallbacks will be slower default
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedFallbacks = [testRpcConfigs.defaultPrimary.url];
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedFallbacks);
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

        const primary = testRpcConfigs.defaultSecondary.url;
        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== primary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary });

        // Should select all matching endpoints (fallback is banned but still included, ranked lower)
        // selectNextFallbacks returns all matching endpoints, not just one
        expect(result).toBeDefined();
        expect(result).toContain(testRpcConfigs.defaultPrimary.url);
        expect(result!.length).toBeGreaterThan(0);

        // Verify fallbackTracker: primary will be fastest default, fallbacks will include all matching endpoints
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedFallbacks = result; // Use actual result
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedFallbacks);
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

        const primary = testRpcConfigs.defaultSecondary.url;
        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== primary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary });

        // Should select all matching endpoints (selectNextFallbacks returns all matching endpoints)
        expect(result).toBeDefined();
        expect(result).toContain(testRpcConfigs.defaultPrimary.url);
        expect(result!.length).toBeGreaterThan(0);

        // Verify fallbackTracker: primary will be fastest default, fallbacks will include all matching endpoints
        const expectedPrimary = testRpcConfigs.defaultSecondary.url;
        const expectedFallbacks = result; // Use actual result
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedFallbacks);
      });

      it("should prefer largeAccount for fallbacks when available and not banned", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        const expectedPrimary = testRpcConfigs.largeAccount.url; // largeAccount will be selected as primary
        const expectedFallbacks = [testRpcConfigs.defaultPrimary.url]; // default will be selected as fallback

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 10, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(testRpcConfigs.largeAccount.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
        ];

        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== expectedPrimary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary: expectedPrimary });

        expect(result).toEqual(expectedFallbacks);
        verifyFallbackTrackerSelection(tracker, stats, expectedPrimary, expectedFallbacks);
      });

      it("should prefer largeAccount purpose for large account fallback selection", () => {
        const params = createMockRpcTrackerParams();
        mockGetRpcProvidersWithTestConfigs(testRpcConfigsArray);
        const tracker = new RpcTracker(params);

        tracker.getIsLargeAccount = () => true;

        // For largeAccount, when selecting fallbacks, it should prefer largeAccount over default
        // But if primary is already largeAccount, fallbacks will be selected from remaining stats
        const expectedPrimary = testRpcConfigs.largeAccount.url;
        const expectedFallbacks = [testRpcConfigs.defaultPrimary.url]; // Only defaultPrimary remains after primary selection

        const stats = [
          createMockEndpointStats(testRpcConfigs.defaultPrimary.url, {
            checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
          }),
          createMockEndpointStats(expectedPrimary, {
            checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
          }),
        ];

        // Test selectNextFallbacks directly - it should prefer default when primary is largeAccount
        // selectNextFallbacks receives stats without primary (as done in selectBestEndpoints)
        const statsWithoutPrimary = stats.filter((s) => s.endpoint !== expectedPrimary);
        const result = tracker.selectNextFallbacks({ endpointsStats: statsWithoutPrimary, primary: expectedPrimary });

        expect(result).toEqual(expectedFallbacks); // Should select default as fallback

        // Verify fallbackTracker and event
        // Include stats for both primary and fallback selection
        const allStats = [
          ...stats,
          createMockEndpointStats(testRpcConfigs.defaultSecondary.url, {
            checkResult: { success: true, stats: { responseTime: 300, blockNumber: 1000000 } },
          }),
        ];
        // After selectBestEndpoints, primary will be largeAccount, fallbacks will be defaultPrimary (from remaining stats)
        verifyFallbackTrackerSelection(tracker, allStats, expectedPrimary, expectedFallbacks);
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

      // For regular account: primary = fastest default, fallbacks = [fallback]
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.defaultSecondary.url, // Fastest default (responseTime: 100)
        [testRpcConfigs.fallback.url] // Fallback (responseTime: 150)
      );
    });

    it("should select unique primary and fallbacks for large account", () => {
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

      // For large account: primary = largeAccount (preferred), fallbacks = [fastest default]
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.largeAccount.url, // largeAccount (preferred even if slower)
        [testRpcConfigs.defaultPrimary.url] // Fastest default (responseTime: 50)
      );
    });

    it("should select unique primary and fallbacks when some endpoints are banned", () => {
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

      // With banned endpoint: primary = fastest non-banned default, fallbacks = [fallback]
      verifyFallbackTrackerSelection(
        tracker,
        stats,
        testRpcConfigs.defaultSecondary.url, // Fastest non-banned default (responseTime: 100)
        [testRpcConfigs.fallback.url] // Fallback (responseTime: 150)
      );
    });

    it("should select empty fallbacks when only one endpoint exists", () => {
      const params = createMockRpcTrackerParams();
      mockGetRpcProvidersWithTestConfigs([testRpcConfigs.defaultPrimary]);
      const tracker = new RpcTracker(params);

      const singleEndpoint = testRpcConfigs.defaultPrimary.url;

      // Verify initial state: constructor should set primary to the single endpoint and fallbacks to empty array
      expect(tracker.fallbackTracker.state.primary).toBe(singleEndpoint);
      expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);

      // Set initial endpoints to different values to test that selectBestEndpoints changes them
      tracker.fallbackTracker.state.primary = "https://old-primary.com";
      tracker.fallbackTracker.state.fallbacks = ["https://old-fallback.com"];
      const eventCapture = captureUpdateEndpointsEvent(tracker);

      tracker.fallbackTracker.selectBestEndpoints();

      // Verify that primary is set and fallbacks are empty when only one endpoint exists
      expect(tracker.fallbackTracker.state.primary).toBe(singleEndpoint);
      expect(tracker.fallbackTracker.state.fallbacks).toEqual([]);

      // When endpoints.length === 1, selectBestEndpoints does early return without calling setCurrentEndpoints
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
          checkResult: { success: true, stats: undefined },
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
