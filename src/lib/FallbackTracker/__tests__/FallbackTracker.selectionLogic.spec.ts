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
      tracker.stopTracking();
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
      expect(stats?.checkResult).toEqual(checkResult);
      expect(stats?.endpoint).toBe(config.primary);
    });

    it("should return endpoint stats without checkResult when no check results exist", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      const stats = tracker.getEndpointStats(config.primary);

      expect(stats).toBeDefined();
      expect(stats?.checkResult).toBeUndefined();
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
      expect(stats?.checkResult).toEqual(checkResult);
    });
  });

  describe("selectBestEndpoints", () => {
    it("should execute immediately on first call (leading edge)", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

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
      trackers.push(tracker);
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
      trackers.push(tracker);

      tracker.selectBestEndpoints();

      expect(tracker.state.primary).toBe(testEndpoints.fallback);
    });

    it("should filter out secondary from primary selection when keepSecondary is true", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

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
      trackers.push(tracker);
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
      trackers.push(tracker);
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
      trackers.push(tracker);
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      tracker.selectBestEndpoints();

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.primary).toBe(tracker.state.primary);
      expect(event.detail.secondary).toBe(tracker.state.secondary);
    });

    it("should allow consecutive selectBestEndpoints calls without throttling", () => {
      const config = createMockConfig({
        selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
        selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
      });
      const tracker = new FallbackTracker(config);
      trackers.push(tracker);

      tracker.selectBestEndpoints();
      tracker.selectBestEndpoints();
      tracker.selectBestEndpoints();

      expect((config.selectNextPrimary as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
    });
  });
});
