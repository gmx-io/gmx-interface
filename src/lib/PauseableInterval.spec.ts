import { PauseableInterval } from "./PauseableInterval";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("PauseableInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should call the callback function at the specified interval", async () => {
    const mockCallback = vi.fn().mockReturnValue(42);
    const interval = 1000;

    new PauseableInterval(mockCallback, interval);

    // Initial call should happen immediately
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      wasPausedSinceLastCall: false,
      lastReturnedValue: undefined,
    });

    // Advance timer by 1 second
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: false,
      lastReturnedValue: 42,
    });
  });

  it("should handle async callbacks", async () => {
    const mockCallback = vi.fn().mockImplementation(async ({ lastReturnedValue }) => {
      return ((lastReturnedValue as number) || 0) + 1;
    });
    const interval = 1000;

    new PauseableInterval(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: false,
      lastReturnedValue: 1,
    });
  });

  it("should stop calling callback when paused", async () => {
    const mockCallback = vi.fn().mockReturnValue(42);
    const interval = 1000;

    const pauseableInterval = new PauseableInterval(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockCallback).toHaveBeenCalledTimes(2);

    pauseableInterval.pause();
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockCallback).toHaveBeenCalledTimes(2); // Should not increase
  });

  it("should not pause again if already paused", async () => {
    const mockCallback = vi.fn();
    const interval = 1000;
    const pauseableInterval = new PauseableInterval(mockCallback, interval);

    pauseableInterval.pause();
    const firstCallCount = mockCallback.mock.calls.length;

    pauseableInterval.pause(); // Second pause should be no-op
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCallback).toHaveBeenCalledTimes(firstCallCount);
  });

  it("should not resume if already running", async () => {
    const mockCallback = vi.fn();
    const interval = 1000;
    const pauseableInterval = new PauseableInterval(mockCallback, interval);

    const initialCallCount = mockCallback.mock.calls.length;
    pauseableInterval.resume(); // Should be no-op as it's already running

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCallback).toHaveBeenCalledTimes(initialCallCount + 1); // Only one new call
  });

  it("should resume calling callback when resumed after pause", async () => {
    const mockCallback = vi.fn().mockReturnValue(42);
    const interval = 1000;

    const pauseableInterval = new PauseableInterval(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockCallback).toHaveBeenCalledTimes(2);

    pauseableInterval.pause();
    await vi.advanceTimersByTimeAsync(1000);

    pauseableInterval.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: true,
      lastReturnedValue: 42,
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockCallback).toHaveBeenCalledTimes(4);
    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: false,
      lastReturnedValue: 42,
    });
  });

  it("should maintain lastReturnedValue across pause/resume cycles", async () => {
    const mockCallback = vi.fn().mockImplementation(({ lastReturnedValue }) => {
      return ((lastReturnedValue as number) || 0) + 1;
    });
    const interval = 1000;

    const pauseableInterval = new PauseableInterval<number>(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    pauseableInterval.pause();
    await vi.advanceTimersByTimeAsync(1000);

    pauseableInterval.resume();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: true,
      lastReturnedValue: 2, // Should maintain the count across pause/resume
    });
  });

  it("should stop calling callback when destroyed", async () => {
    const mockCallback = vi.fn();
    const interval = 1000;

    const pauseableInterval = new PauseableInterval(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    const callCount = mockCallback.mock.calls.length;

    pauseableInterval.destroy();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockCallback).toHaveBeenCalledTimes(callCount);
  });

  it("should handle pause called during synchronous callback execution", async () => {
    let callbackStarted = false;
    const mockCallback = vi.fn().mockImplementation(({ lastReturnedValue }) => {
      callbackStarted = true;
      // Simulate some work
      return ((lastReturnedValue as number) || 0) + 1;
    });
    const interval = 1000;

    const pauseableInterval = new PauseableInterval<number>(mockCallback, interval);

    // Wait for initial call
    await vi.advanceTimersByTimeAsync(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(callbackStarted).toBe(true);

    // Pause right after callback starts
    pauseableInterval.pause();

    // Verify no more calls happen
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should handle pause called during async callback execution", async () => {
    let callbackStarted = false;
    const mockCallback = vi.fn().mockImplementation(async ({ lastReturnedValue }) => {
      callbackStarted = true;
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 100));
      return ((lastReturnedValue as number) || 0) + 1;
    });
    const interval = 1000;

    const pauseableInterval = new PauseableInterval<number>(mockCallback, interval);

    // Wait for initial call to start
    await vi.advanceTimersByTimeAsync(0);
    expect(callbackStarted).toBe(true);

    // Pause while the callback is still executing
    pauseableInterval.pause();

    // Complete the callback execution
    await vi.advanceTimersByTimeAsync(100);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Verify no more calls happen
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Resume should work normally
    pauseableInterval.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith({
      wasPausedSinceLastCall: true,
      lastReturnedValue: 1,
    });
  });
});
