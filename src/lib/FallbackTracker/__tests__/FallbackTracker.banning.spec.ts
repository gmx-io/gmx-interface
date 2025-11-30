import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

describe("FallbackTracker - endpoint banning", () => {
  suppressConsole();
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Cleanup is handled by stopTracking calls in tests
  });

  describe("reportFailure", () => {
    // Basic functionality
    it("should execute immediately on first call (leading edge) and add failure timestamp", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      tracker.reportFailure(config.primary);

      expect(tracker.state.endpointsState[config.primary].failureTimestamps).toHaveLength(1);
      expect(banSpy).not.toHaveBeenCalled();
    });

    it("should not ban endpoint when failure count is below threshold", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      // Default count is 3, so 2 failures should not trigger ban
      tracker.reportFailure(config.primary);
      tracker.reportFailure(config.primary);

      expect(banSpy).not.toHaveBeenCalled();
    });

    it("should ban endpoint when failure count reaches threshold", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      // Default count is 3, so trigger 3 failures
      // First failure
      tracker.reportFailure(config.primary);
      // Wait for throttle to clear
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);

      // Second failure
      tracker.reportFailure(config.primary);
      // Wait for throttle to clear
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);

      // Third failure - should trigger ban
      tracker.reportFailure(config.primary);

      expect(banSpy).toHaveBeenCalledWith(config.primary, "Banned by failures threshold");
    });

    // Throttle behavior
    it("should throttle subsequent calls during throttle period", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const throttleTime = config.failuresBeforeBan.throttle;

      // First call executes immediately (leading edge) - sets failureDebounceTimeout
      tracker.reportFailure(config.primary);
      const initialFailureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(initialFailureCount).toBe(1);
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeDefined();

      // Second call during throttle period - should be ignored
      tracker.reportFailure(config.primary);
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount);

      // Third call during throttle period - should also be ignored
      tracker.reportFailure(config.primary);
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount);

      // Advance time past throttle - timeout clears, but no trailing edge processing
      await vi.advanceTimersByTimeAsync(throttleTime);

      // Should still have only 1 failure (no trailing edge)
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeUndefined();

      // Next call after throttle period - executes immediately again (leading edge)
      tracker.reportFailure(config.primary);
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount + 1);
    });

    it("should ignore multiple failures during throttle period", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const throttleTime = config.failuresBeforeBan.throttle;

      // First call executes immediately (leading edge) - adds failure immediately
      tracker.reportFailure(config.primary);
      const initialFailureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(initialFailureCount).toBe(1);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeDefined();

      // Trigger multiple failures rapidly within throttle window - all should be ignored
      tracker.reportFailure(config.primary);
      tracker.reportFailure(config.primary);
      tracker.reportFailure(config.primary);
      tracker.reportFailure(config.primary);

      // Count should still be 1 (only the first one was added immediately)
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeDefined();

      // Advance time past throttle - timeout clears, but no failures were processed
      await vi.advanceTimersByTimeAsync(throttleTime + 10);

      // Should still have exactly 1 failure (no trailing edge processing)
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(1);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeUndefined();
    });

    it("should handle stopTracking during reportFailure throttle", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeDefined();

      // Trigger another failure during throttle period - should be ignored
      tracker.reportFailure(config.primary);

      // Stop tracking should clear the throttle timeout
      tracker.cleanup();

      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeUndefined();

      // Advance time past throttle - should not process any failures
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle);
      const failureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(failureCount).toBe(1); // Only the initial failure, subsequent ones were ignored
    });

    // Window filtering
    it("should filter out old failure timestamps outside window", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      // Trigger failures with time passing
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(30000);
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(30000);
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(60000); // Move past window (default is 60 seconds)

      // Trigger another failure - should filter out old ones
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10); // Wait for debounce to process

      const endpointState = tracker.state.endpointsState[config.primary];
      const windowStart = Date.now() - config.failuresBeforeBan.window;
      const validFailures = endpointState.failureTimestamps.filter((ts) => ts >= windowStart);

      // Should have only the last failure within the window (previous ones are outside 60s window)
      expect(validFailures.length).toBe(1);
      expect(validFailures[0]).toBeGreaterThanOrEqual(windowStart);
      expect(validFailures[0]).toBeLessThanOrEqual(Date.now());
    });

    // Error handling
    it("should handle invalid endpoint gracefully", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      // Should not throw or crash
      expect(() => {
        tracker.reportFailure(testEndpoints.invalid);
      }).not.toThrow();

      // State should remain unchanged
      expect(tracker.state.endpointsState[config.primary]).toBeDefined();
    });
  });

  describe("banEndpoint", () => {
    // Basic functionality
    it("should set banned state with timestamp and reason", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      tracker.banEndpoint(config.primary, "Test ban reason");

      const banned = tracker.state.endpointsState[config.primary].banned;
      expect(banned).toBeDefined();
      expect(banned?.reason).toBe("Test ban reason");
      expect(banned?.timestamp).toBeGreaterThan(0);
    });

    // Interaction with endpoint selection
    it("should trigger selectBestEndpoints when banning primary endpoint", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const selectSpy = vi.spyOn(tracker, "selectBestEndpoints");

      tracker.banEndpoint(config.primary, "Test ban");

      expect(selectSpy).toHaveBeenCalledWith({ keepPrimary: false, keepSecondary: true });
    });

    it("should trigger selectBestEndpoints when banning secondary endpoint", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const selectSpy = vi.spyOn(tracker, "selectBestEndpoints");

      tracker.banEndpoint(config.secondary, "Test ban");

      expect(selectSpy).toHaveBeenCalledWith({ keepPrimary: true, keepSecondary: false });
    });

    it("should keep primary and secondary when banning not used endpoint", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const selectSpy = vi.spyOn(tracker, "selectBestEndpoints");

      tracker.banEndpoint(testEndpoints.fallback, "Test ban");

      expect(selectSpy).toHaveBeenCalledWith({ keepPrimary: true, keepSecondary: true });
    });

    // Error handling
    it("should handle invalid endpoint gracefully", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      // Should not throw or crash
      expect(() => {
        tracker.banEndpoint(testEndpoints.invalid, "Test ban");
      }).not.toThrow();

      // State should remain unchanged
      expect(tracker.state.endpointsState[config.primary]).toBeDefined();
    });
  });
});
