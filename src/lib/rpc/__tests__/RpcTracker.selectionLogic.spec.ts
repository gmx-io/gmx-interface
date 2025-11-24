import { beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams, createMockEndpointStats, testRpcConfigs } from "./_utils";

describe("RpcTracker - selection logic", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("selectNextPrimary", () => {
    it("should filter by purpose (default for non-large account)", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[2].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextPrimary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[0].url);
    });

    it("should filter by purpose (largeAccount+default for large account)", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      tracker.getIsLargeAccount = () => true;

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[3].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextPrimary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[3].url);
    });

    it("should prefer valid stats over all stats", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const validStats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      const invalidStats = [
        createMockEndpointStats(testRpcConfigs[1].url, {
          checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      vi.spyOn(tracker, "getValidStats").mockReturnValue(validStats);

      const result = tracker.selectNextPrimary({ endpointsStats: [...validStats, ...invalidStats] });

      expect(result).toBe(testRpcConfigs[0].url);
    });

    it("should fall back to all stats when no valid stats match purpose", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const validStats = [
        createMockEndpointStats(testRpcConfigs[2].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      const allStats = [
        ...validStats,
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      vi.spyOn(tracker, "getValidStats").mockReturnValue(validStats);

      const result = tracker.selectNextPrimary({ endpointsStats: allStats });

      expect(result).toBe(testRpcConfigs[0].url);
    });

    it("should rank by preferred purpose, banned timestamp, and responseTime", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextPrimary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[1].url);
    });

    it("should return undefined when no matching endpoints", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      vi.spyOn(tracker, "getRpcConfig").mockReturnValue(undefined);

      const result = tracker.selectNextPrimary({ endpointsStats: [] });

      expect(result).toBeUndefined();
    });
  });

  describe("selectNextSecondary", () => {
    it("should filter by purpose (default+fallback for non-large account)", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[2].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextSecondary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[2].url);
    });

    it("should filter by purpose (largeAccount+default for large account)", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      tracker.getIsLargeAccount = () => true;

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[3].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextSecondary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[0].url);
    });

    it("should prefer fallback purpose for non-large account", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[2].url, {
          checkResult: { success: true, stats: { responseTime: 200, blockNumber: 1000000 } },
        }),
      ];

      testRpcConfigs.forEach((config) => {
        tracker.providersMap[config.url] = config;
      });

      const result = tracker.selectNextSecondary({ endpointsStats: stats });

      expect(result).toBe(testRpcConfigs[2].url);
    });
  });

  describe("getValidStats", () => {
    it("should filter endpoints with successful checks", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
          checkResult: { success: false, stats: { responseTime: 50, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs[0].url);
    });

    it("should filter out endpoints with blockNumber from future", () => {
      const params = createMockRpcTrackerParams({ blockFromFutureThreshold: 1000 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1002000 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs[1].url);
    });

    it("should filter out endpoints with blockNumber lagging", () => {
      const params = createMockRpcTrackerParams({ blockLaggingThreshold: 50 });
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 949 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(1);
      expect(result[0].endpoint).toBe(testRpcConfigs[0].url);
    });

    it("should return empty array when no valid stats", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: false, stats: { responseTime: 100, blockNumber: 1000000 } },
        }),
      ];

      vi.spyOn(tracker, "getBestValidBlock").mockReturnValue(1000000);

      const result = tracker.getValidStats(stats);

      expect(result.length).toBe(0);
    });

    it("should handle undefined blockNumber", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const stats = [
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: undefined } },
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
        createMockEndpointStats(testRpcConfigs[0].url, {
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
        createMockEndpointStats(testRpcConfigs[0].url, {
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
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1000500 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
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
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: 1002000 } },
        }),
        createMockEndpointStats(testRpcConfigs[1].url, {
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
        createMockEndpointStats(testRpcConfigs[0].url, {
          checkResult: { success: true, stats: { responseTime: 100, blockNumber: undefined } },
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
