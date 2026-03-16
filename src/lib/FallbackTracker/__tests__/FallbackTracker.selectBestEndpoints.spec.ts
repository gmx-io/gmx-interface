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
      it("should execute immediately on first call (leading edge)", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);

        tracker.selectBestEndpoints();

        expect(config.selectNextPrimary).toHaveBeenCalled();
        expect(config.selectNextFallbacks).toHaveBeenCalled();
      });

      it("should call selectNextPrimary with correct parameters", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextPrimary).toHaveBeenCalledWith({
          endpointsStats: expect.any(Array),
          primary: originalPrimary,
        });
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, [testEndpoints.primary]);
      });

      it("should call selectNextFallbacks with correct parameters", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextFallbacks).toHaveBeenCalledWith({
          endpointsStats: expect.any(Array),
          primary: testEndpoints.fallback, // selectNextFallbacks is called after selectNextPrimary
          primaryStats: expect.objectContaining({
            endpoint: testEndpoints.fallback,
            checkResults: expect.any(Array),
            failureTimestamps: expect.any(Array),
          }),
        });
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, [testEndpoints.primary]);
      });

      it("should filter out primary from fallbacks selection", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);

        tracker.selectBestEndpoints();

        const selectNextFallbacksMock = config.selectNextFallbacks as ReturnType<typeof vi.fn>;
        const callArgs = selectNextFallbacksMock.mock.calls[0][0];
        const hasPrimary = callArgs.endpointsStats.some((s: any) => s.endpoint === tracker.state.primary);
        expect(hasPrimary).toBe(false);
      });

      it("should keep primary when keepPrimary is true", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints({ keepPrimary: true });

        expect(config.selectNextPrimary).not.toHaveBeenCalled();
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, expect.any(Array));
      });

      it("should update primary endpoint when valid", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);

        tracker.selectBestEndpoints();

        expect(tracker.state.primary).toBe(testEndpoints.fallback);
      });

      it("should handle single endpoint case", () => {
        const singleEndpoint = testEndpoints.primary;
        const config = createMockConfig({
          endpoints: [singleEndpoint],
          primary: singleEndpoint,
          selectNextPrimary: vi.fn(),
          selectNextFallbacks: vi.fn(),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");

        tracker.selectBestEndpoints();

        expect(config.selectNextPrimary).not.toHaveBeenCalled();
        expect(config.selectNextFallbacks).not.toHaveBeenCalled();
        expect(setCurrentEndpointsSpy).not.toHaveBeenCalled();
        expect(tracker.state.primary).toBe(singleEndpoint);
        expect(tracker.state.fallbacks).toEqual([]);
      });

      it("should allow consecutive selectBestEndpoints calls without throttling", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);

        tracker.selectBestEndpoints();
        tracker.selectBestEndpoints();
        tracker.selectBestEndpoints();

        expect((config.selectNextPrimary as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
      });

      it("should save state to localStorage and emit event after update", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.primary]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const setItemSpy = vi.spyOn(localStorage, "setItem");
        const dispatchSpy = vi.spyOn(window, "dispatchEvent");

        tracker.selectBestEndpoints();

        expect(setItemSpy).toHaveBeenCalled();
        const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
        expect(savedData.primary).toBe(tracker.state.primary);
        expect(Array.isArray(savedData.fallbacks)).toBe(true);

        expect(dispatchSpy).toHaveBeenCalled();
        const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.primary).toBe(tracker.state.primary);
        expect(Array.isArray(event.detail.fallbacks)).toBe(true);
      });
    });

    describe("error handling", () => {
      it("should ignore errors in selectNextPrimary and keep current primary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextPrimary");
          }),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.fallback]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextPrimary"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, [testEndpoints.fallback]);
        expect(tracker.state.primary).toBe(originalPrimary);
      });

      it("should ignore errors in selectNextFallbacks and keep current fallbacks", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
          selectNextFallbacks: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextFallbacks");
          }),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalFallbacks = [...tracker.state.fallbacks];
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextFallbacks"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(testEndpoints.fallback, originalFallbacks);
        expect(tracker.state.fallbacks).toEqual(originalFallbacks);
      });

      it("should handle errors in both selectNextPrimary and selectNextFallbacks", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextPrimary");
          }),
          selectNextFallbacks: vi.fn().mockImplementation(() => {
            throw new Error("Test error in selectNextFallbacks");
          }),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const originalFallbacks = [...tracker.state.fallbacks];
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledTimes(2);
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, originalFallbacks);
        expect(tracker.state.primary).toBe(originalPrimary);
        expect(tracker.state.fallbacks).toEqual(originalFallbacks);
      });

      it("should handle non-Error exceptions in selectNextPrimary", () => {
        const config = createMockConfig({
          selectNextPrimary: vi.fn().mockImplementation(() => {
            throw "String error";
          }),
          selectNextFallbacks: vi.fn().mockReturnValue([testEndpoints.fallback]),
        });
        const tracker = new FallbackTracker(config);
        trackers.push(tracker);
        const originalPrimary = tracker.state.primary;
        const setCurrentEndpointsSpy = vi.spyOn(tracker, "setCurrentEndpoints");
        const warnSpy = vi.spyOn(tracker, "warn");

        tracker.selectBestEndpoints();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error in selectNextPrimary"));
        expect(setCurrentEndpointsSpy).toHaveBeenCalledWith(originalPrimary, [testEndpoints.fallback]);
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

    it("should not update if primary and fallbacks are unchanged", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const originalPrimary = tracker.state.primary;
      const originalFallbacks = [...tracker.state.fallbacks];
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      tracker.setCurrentEndpoints(originalPrimary, originalFallbacks);

      expect(saveStorageSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(tracker.state.primary).toBe(originalPrimary);
      expect(tracker.state.fallbacks).toEqual(originalFallbacks);
    });

    it("should update endpoints immediately on first call (leading edge)", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newFallbacks = [testEndpoints.primary];
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      tracker.setCurrentEndpoints(newPrimary, newFallbacks);

      expect(tracker.state.primary).toBe(newPrimary);
      expect(tracker.state.fallbacks).toEqual(newFallbacks);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(fallbackTrackerEventKeys.endpointsUpdated);
      expect(event.detail.primary).toBe(newPrimary);
      expect(event.detail.fallbacks).toEqual(newFallbacks);
    });

    it("should throttle subsequent calls and process last one on trailing edge", () => {
      const config = createMockConfig({
        setEndpointsThrottle: 1000,
      });
      const tracker = new FallbackTracker(config);
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");

      // First call - should execute immediately
      tracker.setCurrentEndpoints(testEndpoints.fallback, [testEndpoints.primary]);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      // Second call during throttle - should be saved for trailing edge
      tracker.setCurrentEndpoints(testEndpoints.secondary, [testEndpoints.fallback]);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(dispatchSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(tracker.state.pendingEndpoints).toEqual({
        primary: testEndpoints.secondary,
        fallbacks: [testEndpoints.fallback],
      });

      // Third call during throttle - should overwrite pending
      tracker.setCurrentEndpoints(testEndpoints.primary, [testEndpoints.secondary]);
      expect(saveStorageSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(tracker.state.pendingEndpoints).toEqual({
        primary: testEndpoints.primary,
        fallbacks: [testEndpoints.secondary],
      });

      // Advance timer to trigger trailing edge
      vi.advanceTimersByTime(1000);

      expect(saveStorageSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(tracker.state.primary).toBe(testEndpoints.primary);
      expect(tracker.state.fallbacks).toEqual([testEndpoints.secondary]);
      expect(tracker.state.pendingEndpoints).toBeUndefined();
      expect(tracker.state.setEndpointsThrottleTimeout).toBeUndefined();
    });

    it("should call saveStorage, emit event, and save to localStorage with correct data", () => {
      const config = createMockConfig();
      const tracker = new FallbackTracker(config);
      const newPrimary = testEndpoints.fallback;
      const newFallbacks = [testEndpoints.primary];
      const saveStorageSpy = vi.spyOn(tracker, "saveStorage");
      const dispatchSpy = vi.spyOn(globalThis, "dispatchEvent");
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      tracker.setCurrentEndpoints(newPrimary, newFallbacks);

      // Verify saveStorage was called with correct parameters
      expect(saveStorageSpy).toHaveBeenCalledWith({
        primary: newPrimary,
        fallbacks: newFallbacks,
        cachedEndpointsState: expect.any(Object),
      });

      // Verify event was emitted with correct data
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(fallbackTrackerEventKeys.endpointsUpdated);
      expect(event.detail).toEqual({
        trackerKey: tracker.trackerKey,
        primary: newPrimary,
        fallbacks: newFallbacks,
        endpointsStats: expect.any(Array),
      });

      // Verify localStorage was updated
      expect(setItemSpy).toHaveBeenCalled();
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.primary).toBe(newPrimary);
      expect(Array.isArray(savedData.fallbacks)).toBe(true);
      expect(savedData.fallbacks).toEqual(newFallbacks);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.cachedEndpointsState).toBeDefined();
    });
  });
});
