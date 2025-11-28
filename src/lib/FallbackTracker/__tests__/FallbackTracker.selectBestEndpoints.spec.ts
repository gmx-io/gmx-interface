import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { suppressConsole } from "lib/__testUtils__/_utils";

import { fallbackTrackerEventKeys } from "../events";
import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

const trackers: FallbackTracker<any>[] = [];

describe("FallbackTracker", () => {
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

  describe("selectBestEndpoints", () => {
    describe("basic functionality", () => {
      it("should call selectNextPrimary with correct parameters", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const originalSecondary = tracker.state.secondary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextPrimary).toHaveBeenCalledWith({
          endpointsStats: expect.any(Array),
          primary: originalPrimary,
          secondary: originalSecondary,
        });
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, testEndpoints.primary);
      });

      it("should call selectNextSecondary with correct parameters", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const originalSecondary = tracker.state.secondary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextSecondary).toHaveBeenCalledWith({
          endpointsStats: expect.any(Array),
          primary: originalPrimary,
          secondary: originalSecondary,
        });
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, testEndpoints.primary);
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
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints({ keepPrimary: true });

        expect(config.selectNextPrimary).not.toHaveBeenCalled();
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, expect.any(String));
      });

      it("should handle single endpoint case", () => {
        const singleEndpoint = testEndpoints.primary;
        const config = createMockConfig({
          endpoints: [singleEndpoint],
          primary: singleEndpoint,
          secondary: singleEndpoint,
          selectNextPrimary: vi.fn(),
          selectNextSecondary: vi.fn(),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextPrimary).not.toHaveBeenCalled();
        expect(config.selectNextSecondary).not.toHaveBeenCalled();
        expect(setCurrentEndpointsSpy).not.toHaveBeenCalled();
        expect(tracker.state.primary).toBe(singleEndpoint);
        expect(tracker.state.secondary).toBe(singleEndpoint);
      });
    });

    describe("error handling", () => {
      it("should ignore errors in selectNextPrimary and keep current primary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextPrimary");
          }),
          selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.fallback),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextPrimary"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, testEndpoints.fallback);
        expect(tracker.state.primary).toBe(originalPrimary);
      });

      it("should ignore errors in selectNextSecondary and keep current secondary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextSecondary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextSecondary");
          }),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalSecondary = tracker.state.secondary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextSecondary"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, originalSecondary);
        expect(tracker.state.secondary).toBe(originalSecondary);
      });

      it("should handle errors in both selectNextPrimary and selectNextSecondary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextPrimary");
          }),
          selectNextSecondary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextSecondary");
          }),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const originalSecondary = tracker.state.secondary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledTimes(2);
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, originalSecondary);
        expect(tracker.state.primary).toBe(originalPrimary);
        expect(tracker.state.secondary).toBe(originalSecondary);
      });

      it("should handle non-Error exceptions in selectNextPrimary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw "String error";
          }),
          selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.fallback),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextPrimary"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, testEndpoints.fallback);
      });
    });
  });

  describe("setCurrentEndpoints", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should not update if primary and secondary are unchanged", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;
      const originalSecondary = tracker.state.secondary;
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      tracker.setCurrentEndpoints(originalPrimary, originalSecondary);

      expect(saveStorageSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(tracker.state.primary).toBe(originalPrimary);
      expect(tracker.state.secondary).toBe(originalSecondary);
    });

    it("should update endpoints immediately on first call (leading edge)", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newSecondary = testEndpoints.primary;
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      tracker.setCurrentEndpoints(newPrimary, newSecondary);

      expect(tracker.state.primary).toBe(newPrimary);
      expect(tracker.state.secondary).toBe(newSecondary);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(fallbackTrackerEventKeys.endpointsUpdated);
      expect(event.detail.primary).toBe(newPrimary);
      expect(event.detail.secondary).toBe(newSecondary);
    });

    it("should throttle subsequent calls and process last one on trailing edge", () => {
      const config = createMockConfig({
        setEndpointsThrottle: 1000,
      });
      const tracker = new FallbackTracker(config);
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      // First call - should execute immediately
      tracker.setCurrentEndpoints(testEndpoints.fallback, testEndpoints.primary);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      // Second call during throttle - should be saved for trailing edge
      tracker.setCurrentEndpoints(testEndpoints.secondary, testEndpoints.fallback);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(dispatchSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(tracker.state.pendingEndpoints).toEqual({
        primary: testEndpoints.secondary,
        secondary: testEndpoints.fallback,
      });

      // Third call during throttle - should overwrite pending
      tracker.setCurrentEndpoints(testEndpoints.primary, testEndpoints.secondary);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(tracker.state.pendingEndpoints).toEqual({
        primary: testEndpoints.primary,
        secondary: testEndpoints.secondary,
      });

      // Advance timer to trigger trailing edge
      vi.advanceTimersByTime(1000);

      expect(saveStorageSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(tracker.state.primary).toBe(testEndpoints.primary);
      expect(tracker.state.secondary).toBe(testEndpoints.secondary);
      expect(tracker.state.pendingEndpoints).toBeUndefined();
      expect(tracker.state.setEndpointsThrottleTimeout).toBeUndefined();
    });

    it("should call saveStorage with correct parameters", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newSecondary = testEndpoints.primary;
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");

      tracker.setCurrentEndpoints(newPrimary, newSecondary);

      expect(saveStorageSpy).toHaveBeenCalledWith({
        primary: newPrimary,
        secondary: newSecondary,
        cachedEndpointsState: expect.any(Object),
      });
    });

    it("should emit updateEndpoints event with correct data", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newSecondary = testEndpoints.primary;
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      tracker.setCurrentEndpoints(newPrimary, newSecondary);

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(fallbackTrackerEventKeys.endpointsUpdated);
      expect(event.detail).toEqual({
        trackerKey: tracker.trackerKey,
        primary: newPrimary,
        secondary: newSecondary,
        endpointsStats: expect.any(Array),
      });
    });

    it("should save to localStorage via saveStorage", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newSecondary = testEndpoints.primary;
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.setCurrentEndpoints(newPrimary, newSecondary);

      expect(setItemSpy).toHaveBeenCalled();
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.primary).toBe(newPrimary);
      expect(savedData.secondary).toBe(newSecondary);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.cachedEndpointsState).toBeDefined();
    });
  });
});
