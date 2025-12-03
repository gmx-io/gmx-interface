import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { NetworkStatusObserver } from "../NetworkStatusObserver";
import { createMockConfig, testEndpoints } from "./_utils";

const trackers: FallbackTracker<any>[] = [];

describe("FallbackTracker - NetworkStatusObserver integration", () => {
  suppressConsole();
  let observer: NetworkStatusObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();

    observer = new NetworkStatusObserver();
  });

  afterEach(() => {
    trackers.forEach((tracker) => {
      tracker.cleanup();
    });
    trackers.length = 0;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("tracking lifecycle and isActive", () => {
    it("should set isActive to true when tracking starts", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0);

      expect(observer.getIsActive(tracker.trackerKey)).toBe(true);
    });

    it("should set isActive to false when tracking stops", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0);
      expect(observer.getIsActive(tracker.trackerKey)).toBe(true);

      tracker.stopTracking();
      expect(observer.getIsActive(tracker.trackerKey)).toBe(false);
    });

    it("should set isActive to false when cleanup is called", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(0);
      expect(observer.getIsActive(tracker.trackerKey)).toBe(true);

      tracker.cleanup();
      expect(observer.getIsActive(tracker.trackerKey)).toBe(false);
    });

    it("should set isActive to false when shouldTrack returns false", () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      // Don't set lastUsage, so shouldTrack will return false
      tracker.track();

      expect(observer.getIsActive(tracker.trackerKey)).toBe(false);
    });
  });

  describe("trackingFailed state", () => {
    it("should set trackingFailed to false when all endpoints succeed", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(false);
    });

    it("should set trackingFailed to true when all endpoints fail", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Endpoint failed")),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(true);
    });

    it("should set trackingFailed to false when at least one endpoint succeeds", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockImplementation((endpoint: string) => {
          if (endpoint === testEndpoints.primary) {
            return Promise.resolve({ responseTime: 100, isValid: true });
          }
          return Promise.reject(new Error("Endpoint failed"));
        }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(false);
    });

    it("should update trackingFailed state after each check cycle", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      // First check - success
      tracker.track();
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(false);

      // Second check - failure
      config.checkEndpoint = vi.fn().mockRejectedValue(new Error("Endpoint failed"));
      await vi.advanceTimersByTimeAsync(config.trackInterval || 10000);
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(true);

      // Third check - success again
      config.checkEndpoint = vi.fn().mockResolvedValue({ responseTime: 100, isValid: true });
      await vi.advanceTimersByTimeAsync(config.trackInterval || 10000);
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getTrackingFailed(tracker.trackerKey)).toBe(false);
    });
  });

  describe("banning with NetworkStatusObserver", () => {
    it("should not ban endpoint when global network is down", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("All endpoints failed")),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("All endpoints failed")),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      // Both trackers fail - global network is down
      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(true);

      // Try to ban endpoint - should not ban because global network is down
      const banSpy = vi.spyOn(tracker1, "banEndpoint");
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      tracker1.reportFailure(config1.primary);

      // Should not ban because global network is down
      expect(banSpy).not.toHaveBeenCalled();
    });

    it("should ban endpoint when global network is up", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      // Both trackers succeed - global network is up
      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(false);

      // Try to ban endpoint - should ban because global network is up
      const banSpy = vi.spyOn(tracker1, "banEndpoint");
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      tracker1.reportFailure(config1.primary);

      // Should ban because global network is up
      expect(banSpy).toHaveBeenCalled();
    });

    it("should ban endpoint when only one tracker is active and it's not failed", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(false);

      const banSpy = vi.spyOn(tracker, "banEndpoint");
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);
      tracker.reportFailure(config.primary);

      expect(banSpy).toHaveBeenCalled();
    });

    it("should not ban endpoint when only one tracker is active and it's failed", async () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("All endpoints failed")),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      tracker.state.lastUsage = Date.now();

      tracker.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(true);

      const banSpy = vi.spyOn(tracker, "banEndpoint");
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);
      tracker.reportFailure(config.primary);
      await vi.advanceTimersByTimeAsync(config.failuresBeforeBan.throttle + 10);
      tracker.reportFailure(config.primary);

      // Should not ban because global network is down
      expect(banSpy).not.toHaveBeenCalled();
    });
  });

  describe("getIsGlobalNetworkDown with multiple trackers", () => {
    it("should return false when at least one active tracker succeeds", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(false);
    });

    it("should return true when all active trackers fail", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getIsGlobalNetworkDown()).toBe(true);
    });

    it("should ignore inactive trackers when determining global network status", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      // Don't set lastUsage, so tracker2 won't track

      tracker1.track();
      await vi.advanceTimersByTimeAsync(100);

      // tracker1 is active and failed, tracker2 is inactive
      // Global network should be down (only active tracker failed)
      expect(observer.getIsGlobalNetworkDown()).toBe(true);
    });

    it("should return false when no active trackers exist", () => {
      const config = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);
      // Don't start tracking

      expect(observer.getIsGlobalNetworkDown()).toBe(false);
    });
  });

  describe("complex scenarios", () => {
    it("should handle tracker recovery after global network failure", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      // Both fail - global network down
      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getIsGlobalNetworkDown()).toBe(true);

      // tracker1 recovers
      config1.checkEndpoint = vi.fn().mockResolvedValue({ responseTime: 100, isValid: true });
      await vi.advanceTimersByTimeAsync(config1.trackInterval || 10000);
      await vi.advanceTimersByTimeAsync(100);

      // Global network should be up (at least one active tracker succeeds)
      expect(observer.getIsGlobalNetworkDown()).toBe(false);
      expect(observer.getTrackingFailed(tracker1.trackerKey)).toBe(false);
      expect(observer.getTrackingFailed(tracker2.trackerKey)).toBe(true);
    });

    it("should handle multiple trackers with mixed success/failure", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockRejectedValue(new Error("Failed")),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      const config3 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker3",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker3 = new FallbackTracker(config3);
      trackers.push(tracker3);
      tracker3.state.lastUsage = Date.now();

      tracker1.track();
      tracker2.track();
      tracker3.track();
      await vi.advanceTimersByTimeAsync(100);

      expect(observer.getTrackingFailed(tracker1.trackerKey)).toBe(false);
      expect(observer.getTrackingFailed(tracker2.trackerKey)).toBe(true);
      expect(observer.getTrackingFailed(tracker3.trackerKey)).toBe(false);
      expect(observer.getIsGlobalNetworkDown()).toBe(false); // At least one succeeds
    });

    it("should prevent banning when global network goes down during failure sequence", async () => {
      const config1 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker1",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker1 = new FallbackTracker(config1);
      trackers.push(tracker1);
      tracker1.state.lastUsage = Date.now();

      const config2 = createMockConfig({
        networkStatusObserver: observer,
        trackerKey: "tracker2",
        checkEndpoint: vi.fn().mockResolvedValue({ responseTime: 100, isValid: true }),
      });
      const tracker2 = new FallbackTracker(config2);
      trackers.push(tracker2);
      tracker2.state.lastUsage = Date.now();

      // Start with both trackers working
      tracker1.track();
      tracker2.track();
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getIsGlobalNetworkDown()).toBe(false);

      // First failure - network still up
      const banSpy = vi.spyOn(tracker1, "banEndpoint");
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      expect(banSpy).not.toHaveBeenCalled();

      // Second failure - network still up
      tracker1.reportFailure(config1.primary);
      await vi.advanceTimersByTimeAsync(config1.failuresBeforeBan.throttle + 10);
      expect(banSpy).not.toHaveBeenCalled();

      // Global network goes down
      config1.checkEndpoint = vi.fn().mockRejectedValue(new Error("Failed"));
      config2.checkEndpoint = vi.fn().mockRejectedValue(new Error("Failed"));
      await vi.advanceTimersByTimeAsync(config1.trackInterval || 10000);
      await vi.advanceTimersByTimeAsync(100);
      expect(observer.getIsGlobalNetworkDown()).toBe(true);

      // Third failure - should not ban because global network is down
      tracker1.reportFailure(config1.primary);
      expect(banSpy).not.toHaveBeenCalled();
    });
  });
});
