import { beforeEach, describe, expect, it, vi } from "vitest";

import { FallbackTracker } from "../FallbackTracker";
import { createMockConfig, testEndpoints } from "./_utils";

describe("FallbackTracker > selectBestEndpoints", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

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

  it("should always evaluate selectors on consecutive calls", () => {
    const config = createMockConfig({
      selectNextPrimary: vi.fn().mockReturnValue(testEndpoints.fallback),
      selectNextSecondary: vi.fn().mockReturnValue(testEndpoints.primary),
    });
    const tracker = new FallbackTracker(config);

    tracker.selectBestEndpoints();
    tracker.selectBestEndpoints();
    tracker.selectBestEndpoints();

    expect((config.selectNextPrimary as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
  });
});
