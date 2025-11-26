import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFallbackTrackerKey } from "config/localStorage";
import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

describe("FallbackTracker - initialization and storage", () => {
  suppressConsole();
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with valid config", () => {
    const config = createMockConfig();
    const tracker = new FallbackTracker(config);

    expect(tracker.state.primary).toBe(config.primary);
    expect(tracker.state.secondary).toBe(config.secondary);
    expect(tracker.state.lastUsage).toBeUndefined();
    expect(Object.keys(tracker.state.endpointsState)).toHaveLength(3);
    expect(tracker.state.endpointsState[config.primary]).toBeDefined();
    expect(tracker.state.endpointsState[config.secondary]).toBeDefined();
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

  it("should throw error when secondary endpoint is not in endpoints list", () => {
    const config = createMockConfig({
      secondary: testEndpoints.invalid,
      endpoints: [testEndpoints.primary, testEndpoints.secondary],
    });

    expect(() => new FallbackTracker(config)).toThrow("Secondary endpoint is not in endpoints list");
  });

  it("should load state from localStorage when valid and not expired", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.secondary,
      secondary: testEndpoints.primary,
      timestamp: Date.now(),
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);

    expect(tracker.state.primary).toBe(storedState.primary);
    expect(tracker.state.secondary).toBe(storedState.secondary);
  });

  it("should ignore localStorage when expired", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.secondary,
      secondary: testEndpoints.primary,
      timestamp: Date.now() - config.cacheTimeout - 1000,
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);

    expect(tracker.state.primary).toBe(config.primary);
    expect(tracker.state.secondary).toBe(config.secondary);
  });

  it("should ignore localStorage when invalid (missing fields)", () => {
    const config = createMockConfig();
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify({ primary: testEndpoints.primary }));

    const tracker = new FallbackTracker(config);

    expect(tracker.state.primary).toBe(config.primary);
    expect(tracker.state.secondary).toBe(config.secondary);
  });

  it("should ignore localStorage when invalid (endpoints not in valid list)", () => {
    const config = createMockConfig();
    const storedState = {
      primary: testEndpoints.invalid,
      secondary: testEndpoints.primary,
      timestamp: Date.now(),
    };
    localStorage.setItem(getFallbackTrackerKey(config.trackerKey), JSON.stringify(storedState));

    const tracker = new FallbackTracker(config);

    expect(tracker.state.primary).toBe(config.primary);
    expect(tracker.state.secondary).toBe(config.secondary);
  });

  it("should initialize endpointsState for all endpoints with default values", () => {
    const config = createMockConfig();
    const tracker = new FallbackTracker(config);

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
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.saveStorage({
        primary: config.primary,
        secondary: config.secondary,
        cachedEndpointsState: tracker.getCachedEndpointsState(),
      });

      expect(setItemSpy).toHaveBeenCalledWith(tracker.trackerKey, expect.any(String));
    });

    it("should include timestamp in saved state", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.saveStorage({
        primary: config.primary,
        secondary: config.secondary,
        cachedEndpointsState: tracker.getCachedEndpointsState(),
      });

      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.primary).toBe(config.primary);
      expect(savedData.secondary).toBe(config.secondary);
    });

    it("should handle localStorage errors gracefully", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      // Should not throw
      expect(() => {
        tracker.saveStorage({
          primary: config.primary,
          secondary: config.secondary,
          cachedEndpointsState: tracker.getCachedEndpointsState(),
        });
      }).not.toThrow();

      setItemSpy.mockRestore();
    });
  });
});
