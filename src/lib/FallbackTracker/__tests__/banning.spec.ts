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
  });

  describe("triggerFailure", () => {
    // Basic functionality
    it("should execute immediately on first call (leading edge) and add failure timestamp", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      tracker.triggerFailure(config.primary);

      expect(tracker.state.endpointsState[config.primary].failureTimestamps).toHaveLength(1);
      expect(banSpy).not.toHaveBeenCalled();
    });

    it("should not ban endpoint when failure count is below threshold", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      // Default count is 3, so 2 failures should not trigger ban
      tracker.triggerFailure(config.primary);
      tracker.triggerFailure(config.primary);

      expect(banSpy).not.toHaveBeenCalled();
    });

    it("should ban endpoint when failure count reaches threshold", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const banSpy = vi.spyOn(tracker, "banEndpoint");

      // Default count is 3, so trigger 3 failures
      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(10);

      tracker.triggerFailure(config.primary);
      // Wait for debounce (default is 2 seconds)
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.debounce + 10);

      tracker.triggerFailure(config.primary);
      // Wait for debounce to process
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.debounce + 10);

      expect(banSpy).toHaveBeenCalledWith(config.primary, "Banned by failures threshold");
    });

    // Debounce behavior
    it("should debounce subsequent calls within debounce window", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const debounceTime = config.failuresBeforeBan.debounce;

      // First call executes immediately (leading edge) - sets failureDebounceTimeout
      tracker.triggerFailure(config.primary);
      const initialFailureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(initialFailureCount).toBe(1);
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeDefined();

      // Wait for first setTimeout to execute and clear failureDebounceTimeout
      await vi.advanceTimersByTimeAsync(debounceTime);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeUndefined();

      // Second call immediately after - executes immediately again (leading edge)
      tracker.triggerFailure(config.primary);
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount + 1);

      // Wait a bit for second call's setTimeout to execute
      await vi.advanceTimersByTimeAsync(10);
      // After setTimeout executes, failureDebounceTimeout is cleared

      // Third call should be debounced - manually set failureDebounceTimeout to simulate pending debounce
      tracker.state.endpointsState[config.primary].failureDebounceTimeout = window.setTimeout(() => {
        // Empty timeout for testing
      }, debounceTime) as unknown as NodeJS.Timeout;
      const countBeforeDebounce = tracker.state.endpointsState[config.primary].failureTimestamps.length;

      tracker.triggerFailure(config.primary);
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(countBeforeDebounce);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeDefined();

      // Advance time past debounce
      await vi.advanceTimersByTimeAsync(debounceTime);

      // Should have processed debounced call
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBeGreaterThan(
        countBeforeDebounce
      );
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeUndefined();
    });

    it("should add only one failure after debounce when multiple failures occur rapidly", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const debounceTime = config.failuresBeforeBan.debounce;

      // First call executes immediately (leading edge) - adds failure immediately
      tracker.triggerFailure(config.primary);
      const initialFailureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(initialFailureCount).toBe(1);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeDefined();

      // Trigger multiple failures rapidly within debounce window
      tracker.triggerFailure(config.primary);
      tracker.triggerFailure(config.primary);
      tracker.triggerFailure(config.primary);
      tracker.triggerFailure(config.primary);

      // Count should still be 1 (only the first one was added immediately)
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(initialFailureCount);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeDefined();

      // Advance time past debounce - should add one more failure (not all the rapid ones)
      await vi.advanceTimersByTimeAsync(debounceTime + 10);

      // Should have exactly 2 failures: initial + one after debounce
      expect(tracker.state.endpointsState[config.primary].failureTimestamps.length).toBe(2);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeUndefined();
    });

    it("should handle stopTracking during triggerFailure debounce", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(10);
      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeDefined();

      // Stop tracking should clear the debounce timeout
      tracker.stopTracking();

      expect(tracker.state.endpointsState[config.primary].failureDebounceTimeout).toBeUndefined();

      // Advance time past default debounce (2 seconds) - should not process debounced failure
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.debounce);
      const failureCount = tracker.state.endpointsState[config.primary].failureTimestamps.length;
      expect(failureCount).toBe(1); // Only the initial failure, debounced one was cancelled
    });

    // Window filtering
    it("should filter out old failure timestamps outside window", async () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);

      // Trigger failures with time passing
      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(30000);
      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(30000);
      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(60000); // Move past window (default is 60 seconds)

      // Trigger another failure - should filter out old ones
      tracker.triggerFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.debounce + 10); // Wait for debounce to process

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
        tracker.triggerFailure(testEndpoints.invalid);
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
