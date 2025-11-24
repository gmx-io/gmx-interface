import { beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockCheckResult, createMockConfig, testEndpoints } from "./_utils";

describe("FallbackTracker - endpoint selection and logic", () => {
  suppressConsole();
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("pickPrimaryEndpoint", () => {
    it("should return current primary endpoint and update lastUsage", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const beforeTime = Date.now();
      const result = tracker.pickPrimaryEndpoint();
      const afterTime = Date.now();

      expect(result).toBe(config.primary);
      expect(tracker.state.lastUsage).toBeGreaterThanOrEqual(beforeTime);
      expect(tracker.state.lastUsage).toBeLessThanOrEqual(afterTime);
    });

    it("should return config.primary as fallback when state.primary is invalid", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      tracker.state.primary = testEndpoints.invalid;

      const result = tracker.pickPrimaryEndpoint();

      expect(result).toBe(config.primary);
    });
  });

  describe("pickSecondaryEndpoint", () => {
    it("should return current secondary endpoint and update lastUsage", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const beforeTime = Date.now();
      const result = tracker.pickSecondaryEndpoint();
      const afterTime = Date.now();

      expect(result).toBe(config.secondary);
      expect(tracker.state.lastUsage).toBeGreaterThanOrEqual(beforeTime);
      expect(tracker.state.lastUsage).toBeLessThanOrEqual(afterTime);
    });

    it("should return config.primary as fallback when state.secondary is invalid", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      tracker.state.secondary = testEndpoints.invalid;

      const result = tracker.pickSecondaryEndpoint();

      expect(result).toBe(config.primary);
    });
  });

  describe("getEndpointStats", () => {
    it("should return endpoint stats with checkResult when available", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const checkResult = createMockCheckResult({ endpoint: config.primary });
      tracker.state.checkStats.push({
        timestamp: Date.now(),
        results: {
          [config.primary]: checkResult,
        },
      });

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats).toBeDefined();
      expect(stats?.checkResult).toEqual(checkResult);
      expect(stats?.endpoint).toBe(config.primary);
    });

    it("should return endpoint stats without checkResult when no check results exist", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats).toBeDefined();
      expect(stats?.checkResult).toBeUndefined();
      expect(stats?.endpoint).toBe(config.primary);
    });

    it("should return undefined for invalid endpoint", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      const stats = tracker.getEndpointStats(testEndpoints.invalid);

      expect(stats).toBeUndefined();
    });

    it("should merge endpoint state with latest check result", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      tracker.state.endpointsState[config.primary].failureTimestamps.push(Date.now());
      const checkResult = createMockCheckResult({ endpoint: config.primary });
      tracker.state.checkStats.push({
        timestamp: Date.now(),
        results: {
          [config.primary]: checkResult,
        },
      });

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats?.failureTimestamps).toHaveLength(1);
      expect(stats?.checkResult).toEqual(checkResult);
    });
  });

  describe("getEndpoints", () => {
    it("should return endpoints from config", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      expect(tracker.getEndpoints()).toEqual(config.endpoints);
    });
  });

  describe("selectBestEndpoints", () => {
    it("should execute immediately on first call (leading edge)", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints();

      expect(config.selectNextPrimary).toHaveBeenCalled();
      expect(config.selectNextSecondary).toHaveBeenCalled();
    });

    it("should call selectNextPrimary with correct parameters", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;
      const originalSecondary = tracker.state.secondary;

      tracker.selectBestEndpoints();

      expect(config.selectNextPrimary).toHaveBeenCalledWith({
        endpointsStats: expect.any(Array),
        primary: originalPrimary,
        secondary: originalSecondary,
      });
    });

    it("should update primary endpoint when valid", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints();

      expect(tracker.state.primary).toBe(testEndpoints.fallback);
    });

    it("should filter out secondary from primary selection when keepSecondary is true", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints({ keepSecondary: true });

      const selectNextPrimaryMock = config.selectNextPrimary as ReturnType<typeof vi.fn>;
      const callArgs = selectNextPrimaryMock.mock.calls[0][0];
      const hasSecondary = callArgs.endpointsStats.some((s) => s.endpoint === tracker.state.secondary);
      expect(hasSecondary).toBe(false);
    });

    it("should keep primary when keepPrimary is true", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;

      tracker.selectBestEndpoints({ keepPrimary: true });

      expect(tracker.state.primary).toBe(originalPrimary);
      expect(config.selectNextPrimary).not.toHaveBeenCalled();
    });

    it("should save state to localStorage after update", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.selectBestEndpoints();

      expect(setItemSpy).toHaveBeenCalled();
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.primary).toBe(tracker.state.primary);
      expect(savedData.secondary).toBe(tracker.state.secondary);
    });

    it("should emit endpointsUpdated event", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      tracker.selectBestEndpoints();

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.primary).toBe(tracker.state.primary);
      expect(event.detail.secondary).toBe(tracker.state.secondary);
    });

    it("should call onUpdate callback when provided", () => {
      const onUpdate = vi.fn();
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        onUpdate,
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints();

      expect(onUpdate).toHaveBeenCalled();
    });

    it("should debounce subsequent calls within debounce window", async () => {
      vi.useFakeTimers();
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        switchEndpointsDebounce: 1000,
      });
      const tracker = new FallbackTracker(config);
      const selectNextPrimaryMock = config.selectNextPrimary as ReturnType<typeof vi.fn>;

      // First call executes immediately (leading edge) - sets switchEndpointsTimeout
      tracker.selectBestEndpoints();
      expect(selectNextPrimaryMock.mock.calls.length).toBe(1);
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.switchEndpointsTimeout).toBeDefined();

      // Wait for first setTimeout to execute and clear switchEndpointsTimeout
      await vi.advanceTimersByTimeAsync(1000);
      expect(tracker.state.switchEndpointsTimeout).toBeUndefined();

      // Second call immediately after - executes immediately again (leading edge)
      tracker.selectBestEndpoints();
      expect(selectNextPrimaryMock.mock.calls.length).toBe(2);

      // Wait a bit for second call's setTimeout to be set
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.switchEndpointsTimeout).toBeDefined();

      // Third call should be debounced - clears timeout and sets new one
      tracker.selectBestEndpoints();
      // Should still be 2 because third call is debounced
      expect(selectNextPrimaryMock.mock.calls.length).toBe(2);

      // To properly test debounce, we need to simulate that switchEndpointsTimeout is set
      // Let's manually set it and then call selectBestEndpoints
      tracker.state.switchEndpointsTimeout = window.setTimeout(() => {
        // Empty timeout for testing
      }, 1000);
      const callCountBeforeDebounce = selectNextPrimaryMock.mock.calls.length;

      tracker.selectBestEndpoints();
      expect(selectNextPrimaryMock.mock.calls.length).toBe(callCountBeforeDebounce); // Still same, debounced

      // Advance time past debounce window
      await vi.advanceTimersByTimeAsync(1000);

      // Should have executed debounced call
      expect(selectNextPrimaryMock.mock.calls.length).toBeGreaterThan(callCountBeforeDebounce);
      expect(tracker.state.switchEndpointsTimeout).toBeUndefined();

      vi.useRealTimers();
    });

    it("should handle stopTracking during selectBestEndpoints debounce", async () => {
      vi.useFakeTimers();
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        switchEndpointsDebounce: 1000,
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints();
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.switchEndpointsTimeout).toBeDefined();

      // Stop tracking should clear the debounce timeout
      tracker.stopTracking();

      expect(tracker.state.switchEndpointsTimeout).toBeUndefined();

      // Advance time - should not execute debounced call
      await vi.advanceTimersByTimeAsync(1000);
      const callCount = (config.selectNextPrimary as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCount).toBe(1); // Only the initial call, debounced call was cancelled

      vi.useRealTimers();
    });

    it("should handle rapid selectBestEndpoints calls with stopTracking", async () => {
      vi.useFakeTimers();
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        switchEndpointsDebounce: 1000,
      });
      const tracker = new FallbackTracker(config);

      tracker.selectBestEndpoints();
      tracker.selectBestEndpoints();
      tracker.selectBestEndpoints();
      await vi.advanceTimersByTimeAsync(10);

      tracker.stopTracking();

      expect(tracker.state.switchEndpointsTimeout).toBeUndefined();

      vi.useRealTimers();
    });

    it("should handle error in selectNextPrimary gracefully", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockImplementation(() => {
          throw new Error("Selection failed");
        }),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;

      tracker.selectBestEndpoints();

      // Should fallback to current primary when selectNextPrimary throws
      expect(tracker.state.primary).toBe(originalPrimary);
      expect(config.selectNextPrimary).toHaveBeenCalled();
    });

    it("should handle error in selectNextSecondary gracefully", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockImplementation(() => {
          throw new Error("Selection failed");
        }),
      });
      const tracker = new FallbackTracker(config);
      const originalSecondary = tracker.state.secondary;

      tracker.selectBestEndpoints();

      // Should fallback to current secondary when selectNextSecondary throws
      expect(tracker.state.secondary).toBe(originalSecondary);
      expect(config.selectNextSecondary).toHaveBeenCalled();
    });

    it("should handle errors in both selectNextPrimary and selectNextSecondary", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockImplementation(() => {
          throw new Error("Primary selection failed");
        }),
        selectNextSecondary: vi.fn().mockImplementation(() => {
          throw new Error("Secondary selection failed");
        }),
      });
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;
      const originalSecondary = tracker.state.secondary;

      tracker.selectBestEndpoints();

      // Should fallback to current endpoints when both throw
      expect(tracker.state.primary).toBe(originalPrimary);
      expect(tracker.state.secondary).toBe(originalSecondary);
      expect(config.selectNextPrimary).toHaveBeenCalled();
      expect(config.selectNextSecondary).toHaveBeenCalled();
    });
  });
});
