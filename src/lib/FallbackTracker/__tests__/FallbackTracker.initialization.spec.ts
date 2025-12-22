import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getFallbackTrackerKey } from "config/localStorage";
import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

const trackers: FallbackTracker<any>[] = [];

describe("FallbackTracker - initialization and storage", () => {
  suppressConsole();
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    trackers.forEach((tracker) => {
      tracker.cleanup();
    });
    trackers.length = 0;
  });

  it("should initialize with valid config", () => {
    const config = createMockConfig();
    const tracker = new FallbackTracker(config);
    trackers.push(tracker);
    trackers.push(tracker);

    expect(tracker.state.primary).toBe(config.primary);
    expect(Array.isArray(tracker.state.fallbacks)).toBe(true);
    expect(tracker.state.lastUsage).toBeUndefined();
    expect(Object.keys(tracker.state.endpointsState)).toHaveLength(3);
    expect(tracker.state.endpointsState[config.primary]).toBeDefined();
    expect(tracker.state.endpointsState[testEndpoints.secondary]).toBeDefined();
  });

  it("should throw error when endpoints array is empty", () => {
    const config = createMockConfig({ endpoints: [] });

    expect(() => new FallbackTracker(config)).toThrow("No endpoints provided");
  });

  it("should throw error when primary endpoint is not in endpoints list", () => {
    const config = createMockConfig({
      primary: testEndpoints.invalid,
      endpoints: [testEndpoints.primary, testEndpoints.secondary],
    });

    expect(() => new FallbackTracker(config)).toThrow("Primary endpoint is not in endpoints list");
  });

  it("should load state from localStorage when valid and not expired", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.secondary,
      fallbacks: [testEndpoints.primary],
      timestamp: Date.now(),
      cachedEndpointsState: {},
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);
    trackers.push(tracker);

    expect(tracker.state.primary).toBe(storedState.primary);
    expect(tracker.state.fallbacks).toEqual(storedState.fallbacks);
  });

  it("should ignore localStorage when expired", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.secondary,
      fallbacks: [testEndpoints.primary],
      timestamp: Date.now() - config.cacheTimeout - 1000,
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);
    trackers.push(tracker);

    expect(tracker.state.primary).toBe(config.primary);
    expect(Array.isArray(tracker.state.fallbacks)).toBe(true);
  });

  it("should ignore localStorage when invalid (missing fields)", () => {
    const config = createMockConfig();
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify({ primary: testEndpoints.primary }));

    const tracker = new FallbackTracker(config);
    trackers.push(tracker);

    expect(tracker.state.primary).toBe(config.primary);
    expect(Array.isArray(tracker.state.fallbacks)).toBe(true);
  });

  it("should ignore localStorage when invalid (endpoints not in valid list)", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.invalid,
      fallbacks: [testEndpoints.primary],
      timestamp: Date.now(),
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);
    trackers.push(tracker);

    expect(tracker.state.primary).toBe(config.primary);
    expect(Array.isArray(tracker.state.fallbacks)).toBe(true);
  });

  it("should initialize endpointsState for all endpoints with default values", () => {
    const config = createMockConfig();
    const tracker = new FallbackTracker(config);
    trackers.push(tracker);

    config.endpoints.forEach((endpoint) => {
      const state = tracker.state.endpointsState[endpoint];
      expect(state).toBeDefined();
      expect(state.endpoint).toBe(endpoint);
      expect(state.failureTimestamps).toEqual([]);
      expect(state.banned).toBeUndefined();
      expect(state.failureThrottleTimeout).toBeUndefined();
    });
  });

  describe("saveStorage", () => {
    it("should save state to localStorage with correct key", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.saveStorage({
        primary: config.primary,
        fallbacks: tracker.state.fallbacks,
        cachedEndpointsState: tracker.getCachedEndpointsState(),
      });

      expect(setItemSpy).toHaveBeenCalledWith(tracker.storageKey, expect.any(String));
    });

    it("should include timestamp in saved state", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.saveStorage({
        primary: config.primary,
        fallbacks: tracker.state.fallbacks,
        cachedEndpointsState: tracker.getCachedEndpointsState(),
      });

      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.primary).toBe(config.primary);
      expect(Array.isArray(savedData.fallbacks)).toBe(true);
    });

    it("should handle localStorage errors gracefully", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      // Should not throw
      expect(() => {
        tracker.saveStorage({
          primary: config.primary,
          fallbacks: tracker.state.fallbacks,
          cachedEndpointsState: tracker.getCachedEndpointsState(),
        });
      }).not.toThrow();

      setItemSpy.mockRestore();
    });
  });
});
