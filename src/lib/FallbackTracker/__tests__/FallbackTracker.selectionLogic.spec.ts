import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { FallbackTracker } from "../FallbackTracker";
import { createMockCheckResult, createMockConfig, testEndpoints } from "./_utils";

const trackers: FallbackTracker<any>[] = [];

describe("FallbackTracker - endpoint selection and logic", () => {
  suppressConsole();
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    trackers.forEach((tracker) => {
      tracker.cleanup();
    });
    trackers.length = 0;
  });

  describe("getEndpointStats", () => {
    it("should return endpoint stats with checkResult when available", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const checkResult = createMockCheckResult({ endpoint: config.primary });
      tracker.state.checkStats.push({
        timestamp: Date.now(),
        results: {
          [config.primary]: checkResult,
        },
      });

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats).toBeDefined();
      expect(stats?.checkResults).toBeDefined();
      expect(stats?.checkResults).toHaveLength(1);
      expect(stats?.checkResults[0]).toEqual(checkResult);
      expect(stats?.endpoint).toBe(config.primary);
    });

    it("should return endpoint stats without checkResult when no check results exist", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats).toBeDefined();
      expect(stats?.checkResults).toBeDefined();
      expect(stats?.checkResults).toHaveLength(0);
      expect(stats?.endpoint).toBe(config.primary);
    });

    it("should return undefined for invalid endpoint", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const stats = tracker.getEndpointStats(testEndpoints.invalid);

      expect(stats).toBeUndefined();
    });

    it("should merge endpoint state with latest check result", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

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
      expect(stats?.checkResults).toBeDefined();
      expect(stats?.checkResults).toHaveLength(1);
      expect(stats?.checkResults[0]).toEqual(checkResult);
    });
  });
});
