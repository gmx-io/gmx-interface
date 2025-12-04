import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

const trackers: FallbackTracker<any>[] = [];

describe("FallbackTracker - endpoint tracking and monitoring", () => {
  suppressConsole();
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    trackers.forEach((tracker) => {
      tracker.cleanup();
    });
    trackers.length = 0;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("checkEndpoints", () => {
    it("should check all endpoints concurrently", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      await tracker.checkEndpoints(abortController);

      expect(config.checkEndpoint).toHaveBeenCalledTimes(config.endpoints.length);
      config.endpoints.forEach((endpoint) => {
        expect(config.checkEndpoint).toHaveBeenCalledWith(endpoint, expect.any(AbortSignal));
      });
    });

    it("should create new AbortController for each check cycle", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      expect(tracker.state.abortController).toBeUndefined();

      const firstController = new AbortController();
      tracker.state.abortController = firstController;
      await tracker.checkEndpoints(firstController);
      expect(firstController).toBeDefined();

      const secondController = new AbortController();
      tracker.state.abortController = secondController;
      await tracker.checkEndpoints(secondController);

      expect(firstController).not.toBe(secondController);
      expect(secondController).toBeDefined();
    });

    it("should abort previous AbortController when starting new check", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            })
        ),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const firstController = new AbortController();
      tracker.checkEndpoints(firstController);

      // Start second check which should abort the first
      const secondController = new AbortController();
      const secondCheckPromise = tracker.checkEndpoints(secondController);

      // Wait a bit to ensure abort happens
      await vi.advanceTimersByTimeAsync(10);

      expect(firstController?.signal.aborted).toBe(true);

      // Clean up - abort the second controller to prevent hanging
      tracker.state.abortController?.abort();
      await secondCheckPromise.catch(() => {
        // Ignore rejection from abort
      });
    });

    it("should handle successful endpoint checks", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      await tracker.checkEndpoints(abortController);

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(true);
      });
    });

    it("should handle failed endpoint checks", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Check failed")),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      await tracker.checkEndpoints(abortController);

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(false);
        expect(lastResults?.[endpoint]?.error).toBeDefined();
      });
    });

    it("should handle timeout errors correctly", async () => {
      const config = createMockConfig({
        checkTimeout: 100,
        checkEndpoint: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            })
        ), // Never resolves
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(150);
      await checkPromise;

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(false);
      });
    });

    it("should store check results in checkStats array", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      await tracker.checkEndpoints(abortController);

      expect(tracker.state.checkStats).toHaveLength(1);
      expect(tracker.state.checkStats[0].results).toBeDefined();
    });

    it("should limit checkStats to maxStoredCheckStats", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      // Create more check stats than STORED_CHECK_STATS_MAX_COUNT (which is 10)
      for (let i = 0; i < 15; i++) {
        const abortController = new AbortController();
        tracker.state.abortController = abortController;
        await tracker.checkEndpoints(abortController);
        // Advance time to ensure different timestamps
        await vi.advanceTimersByTimeAsync(config.trackInterval || 10000);
      }

      // Should be limited to STORED_CHECK_STATS_MAX_COUNT (10)
      expect(tracker.state.checkStats.length).toBeLessThanOrEqual(10);
    });

    it("should handle partial failures - some endpoints succeed, some fail", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation((endpoint: string) => {
          if (endpoint === testEndpoints.primary) {
            return Promise.resolve({ responseTime: 100, isValid: true });
          }
          return Promise.reject(new Error("Endpoint failed"));
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      await tracker.checkEndpoints(abortController);

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      expect(lastResults?.[testEndpoints.primary]?.success).toBe(true);
      expect(lastResults?.[testEndpoints.secondary]?.success).toBe(false);
      expect(lastResults?.[testEndpoints.fallback]?.success).toBe(false);
    });

    it("should handle partial timeouts - some endpoints timeout, others succeed", async () => {
      const config = createMockConfig({
        checkTimeout: 100,
        checkEndpoint: vi.fn().mockImplementation((endpoint: string) => {
          if (endpoint === testEndpoints.primary) {
            return Promise.resolve({ responseTime: 50, isValid: true });
          }
          // Other endpoints never resolve (will timeout)
          return new Promise(() => {
            // Never resolves
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(150);
      await checkPromise;

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      expect(lastResults?.[testEndpoints.primary]?.success).toBe(true);
      expect(lastResults?.[testEndpoints.secondary]?.success).toBe(false);
      expect(lastResults?.[testEndpoints.secondary]?.error?.message).toBe("Check timeout");
      expect(lastResults?.[testEndpoints.fallback]?.success).toBe(false);
      expect(lastResults?.[testEndpoints.fallback]?.error?.message).toBe("Check timeout");
    });

    it("should abort all checks when global abortController is aborted", async () => {
      const abortSignals: AbortSignal[] = [];
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation((endpoint: string, signal: AbortSignal) => {
          abortSignals.push(signal);
          return new Promise(() => {
            // Never resolves
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(10); // Let checks start

      // Abort global controller
      abortController.abort();

      await vi.advanceTimersByTimeAsync(10);

      // All signals should be aborted
      abortSignals.forEach((signal) => {
        expect(signal.aborted).toBe(true);
      });

      // Clean up
      await checkPromise.catch(() => {
        // Ignore rejection from abort
      });
    });

    it("should wait for all checks to complete even if some fail quickly", async () => {
      const callOrder: string[] = [];
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation((endpoint: string) => {
          callOrder.push(`start-${endpoint}`);
          if (endpoint === testEndpoints.primary) {
            return Promise.resolve({ responseTime: 10, isValid: true }).then((result) => {
              callOrder.push(`done-${endpoint}`);
              return result;
            });
          }
          // Other endpoints take longer
          return new Promise((resolve) => {
            setTimeout(() => {
              callOrder.push(`done-${endpoint}`);
              resolve({ responseTime: 100, isValid: true });
            }, 50);
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(10);

      // Primary should complete quickly, but we should wait for others
      expect(callOrder).toContain(`done-${testEndpoints.primary}`);

      await vi.advanceTimersByTimeAsync(100);
      await checkPromise;

      // All endpoints should have completed
      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(true);
      });
    });

    it("should handle mixed scenarios - success, failure, and timeout", async () => {
      const config = createMockConfig({
        checkTimeout: 100,
        checkEndpoint: vi.fn().mockImplementation((endpoint: string) => {
          if (endpoint === testEndpoints.primary) {
            return Promise.resolve({ responseTime: 50, isValid: true });
          }
          if (endpoint === testEndpoints.secondary) {
            return Promise.reject(new Error("Network error"));
          }
          // Fallback times out
          return new Promise(() => {
            // Never resolves
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(150);
      await checkPromise;

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      expect(lastResults?.[testEndpoints.primary]?.success).toBe(true);
      expect(lastResults?.[testEndpoints.secondary]?.success).toBe(false);
      expect(lastResults?.[testEndpoints.secondary]?.error?.message).toBe("Network error");
      expect(lastResults?.[testEndpoints.fallback]?.success).toBe(false);
      expect(lastResults?.[testEndpoints.fallback]?.error?.message).toBe("Check timeout");
    });

    it("should handle abort signal during check execution", async () => {
      let checkAborted = false;
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation((endpoint: string, signal: AbortSignal) => {
          signal.addEventListener("abort", () => {
            checkAborted = true;
          });
          return new Promise(() => {
            // Never resolves
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const firstAbortController = new AbortController();
      const firstCheckPromise = tracker.checkEndpoints(firstAbortController);
      await vi.advanceTimersByTimeAsync(10);

      // Start second check which should abort the first
      const secondAbortController = new AbortController();
      const secondCheckPromise = tracker.checkEndpoints(secondAbortController);
      await vi.advanceTimersByTimeAsync(10);

      expect(checkAborted).toBe(true);

      // Clean up
      tracker.state.abortController?.abort();
      await firstCheckPromise.catch(() => {
        // Ignore errors from aborted checks
      });
      await secondCheckPromise.catch(() => {
        // Ignore errors from aborted checks
      });
    });

    it("should handle very fast check completion", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 1, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const startTime = Date.now();
      await tracker.checkEndpoints(abortController);
      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);

      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(true);
      });
    });

    it("should handle AbortError from checkEndpoint correctly", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation((endpoint: string, signal: AbortSignal) => {
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () => {
              const abortError = new Error("Aborted");
              abortError.name = "AbortError";
              reject(abortError);
            });
            // Never resolves unless aborted
          });
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const abortController = new AbortController();
      tracker.state.abortController = abortController;
      const checkPromise = tracker.checkEndpoints(abortController);
      await vi.advanceTimersByTimeAsync(10);

      abortController.abort();
      await vi.advanceTimersByTimeAsync(10);

      await checkPromise;

      // Should handle abort gracefully - all endpoints should be marked as failed
      const lastResults = tracker.getLastCheckResults();
      expect(lastResults).toBeDefined();
      config.endpoints.forEach((endpoint) => {
        expect(lastResults?.[endpoint]?.success).toBe(false);
      });
    });
  });

  describe("shouldTrack", () => {
    it("should return false when only one endpoint exists", () => {
      const config = createMockConfig({
        endpoints: [testEndpoints.primary],
        primary: testEndpoints.primary,
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      expect(tracker.shouldTrack()).toBe(false);
    });

    it("should return true when multiple endpoints exist and recently used", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      expect(tracker.shouldTrack()).toBe(true);
    });

    it("should return false when unused for longer than disableUnusedTrackingTimeout", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now() - config.disableUnusedTrackingTimeout - 1000;

      expect(tracker.shouldTrack()).toBe(false);
    });

    it("should return true when warmUp is true (regardless of usage)", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now() - config.disableUnusedTrackingTimeout - 1000;

      expect(tracker.shouldTrack({ warmUp: true })).toBe(true);
    });
  });

  describe("track", () => {
    it("should start tracking when shouldTrack returns true (recently used)", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now(); // Set lastUsage

      expect(tracker.shouldTrack()).toBe(true);
      tracker.track();
      await vi.advanceTimersByTimeAsync(0);

      expect(config.checkEndpoint).toHaveBeenCalled();
    });

    it("should not start tracking when shouldTrack returns false (unused for too long)", () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn(),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now() - config.disableUnusedTrackingTimeout - 1000;

      expect(tracker.shouldTrack()).toBe(false);
      tracker.track();

      expect(config.checkEndpoint).not.toHaveBeenCalled();
    });

    it("should not start tracking when only one endpoint exists", () => {
      const config = createMockConfig({
        endpoints: [testEndpoints.primary],
        primary: testEndpoints.primary,
        checkEndpoint: vi.fn(),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      expect(tracker.shouldTrack()).toBe(false);
      tracker.track();

      expect(config.checkEndpoint).not.toHaveBeenCalled();
    });

    it("should start tracking when warmUp is true (regardless of usage)", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now() - config.disableUnusedTrackingTimeout - 1000;

      expect(tracker.shouldTrack({ warmUp: true })).toBe(true);
      tracker.track({ warmUp: true });
      await vi.advanceTimersByTimeAsync(0);

      expect(config.checkEndpoint).toHaveBeenCalled();
    });

    it("should schedule next track call after trackInterval", async () => {
      const config = createMockConfig({
        trackInterval: 1000,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0); // Complete first check

      // Clear mock to count only new calls
      (config.checkEndpoint as ReturnType<typeof vi.fn>).mockClear();

      await vi.advanceTimersByTimeAsync(1000); // Wait for next track call

      expect(config.checkEndpoint).toHaveBeenCalledTimes(config.endpoints.length);
    });

    it("should continue tracking even if checkEndpoints fails", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Check failed")),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0); // Complete first check (will fail)

      // Clear mock to count only new calls
      (config.checkEndpoint as ReturnType<typeof vi.fn>).mockClear();

      await vi.advanceTimersByTimeAsync(config.trackInterval); // Wait for next track call

      expect(config.checkEndpoint).toHaveBeenCalledTimes(config.endpoints.length);
    });

    it("should handle stopTracking during checkEndpoints execution", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            })
        ),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(10); // Start checkEndpoints and let abortController be set

      // Stop tracking while checkEndpoints is running
      const abortController = tracker.state.abortController;
      tracker.cleanup();

      expect(abortController?.signal.aborted).toBe(true);
      expect(tracker.state.trackerTimeoutId).toBeUndefined();
      expect(tracker.state.abortController).toBeUndefined();
    });

    it("should handle rapid track/stopTracking calls", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      tracker.cleanup();
      tracker.track();
      tracker.cleanup();

      expect(tracker.state.trackerTimeoutId).toBeUndefined();
      expect(tracker.state.abortController).toBeUndefined();
    });

    it("should handle track called multiple times rapidly", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0); // Let first track start

      const firstCallCount = (config.checkEndpoint as ReturnType<typeof vi.fn>).mock.calls.length;

      // Second call should abort first and start new check
      tracker.track();
      await vi.advanceTimersByTimeAsync(0);

      // Should abort previous check and start new one
      expect((config.checkEndpoint as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe("stopTracking", () => {
    it("should clear trackerTimeoutId", () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.primary),
        selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.secondary]),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();
      tracker.track();

      tracker.cleanup();

      expect(tracker.state.trackerTimeoutId).toBeUndefined();
    });

    it("should abort current abortController", async () => {
      const config = createMockConfig({
        checkEndpoint: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              // Never resolves
            })
        ),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();
      tracker.track();
      await vi.advanceTimersByTimeAsync(0);

      const controller = tracker.state.abortController;
      tracker.cleanup();

      expect(controller?.signal.aborted).toBe(true);
    });

    it("should clear all failure throttle timeouts", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.reportFailure(config.primary);
      // Trigger another failure during throttle period - should be ignored
      tracker.reportFailure(config.primary);

      tracker.cleanup();

      expect(tracker.state.endpointsState[config.primary].failureThrottleTimeout).toBeUndefined();
    });
  });
});
