import { describe, expect, it, vi } from "vitest";

import { combineAbortSignals } from "utils/abort";

describe("combineAbortSignals", () => {
  it("should return an AbortController", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined).toBeInstanceOf(AbortController);
    expect(combined.signal.aborted).toBe(false);
  });

  it("should abort combined controller when first signal is aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    controller1.abort();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.signal.aborted).toBe(true);
  });

  it("should abort combined controller when second signal is aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    controller2.abort();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.signal.aborted).toBe(true);
  });

  it("should abort combined controller when any signal is aborted after creation", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.signal.aborted).toBe(false);

    controller1.abort();

    expect(combined.signal.aborted).toBe(true);
  });

  it("should abort combined controller when multiple signals are aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    const controller3 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal, controller3.signal);

    expect(combined.signal.aborted).toBe(false);

    controller2.abort();

    expect(combined.signal.aborted).toBe(true);
  });

  it("should clean up event listeners when combined controller is aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeEventListener1 = vi.spyOn(controller1.signal, "removeEventListener");
    const removeEventListener2 = vi.spyOn(controller2.signal, "removeEventListener");

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    combined.abort();

    expect(removeEventListener1).toHaveBeenCalled();
    expect(removeEventListener2).toHaveBeenCalled();
  });

  it("should clean up event listeners when source signal is aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeEventListener1 = vi.spyOn(controller1.signal, "removeEventListener");
    const removeEventListener2 = vi.spyOn(controller2.signal, "removeEventListener");

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    controller1.abort();

    expect(combined.signal.aborted).toBe(true);
    expect(removeEventListener1).toHaveBeenCalled();
    expect(removeEventListener2).toHaveBeenCalled();
  });

  it("should work with single signal", () => {
    const controller = new AbortController();
    const combined = combineAbortSignals(controller.signal);

    expect(combined.signal.aborted).toBe(false);

    controller.abort();

    expect(combined.signal.aborted).toBe(true);
  });

  it("should work with empty array", () => {
    const combined = combineAbortSignals();

    expect(combined).toBeInstanceOf(AbortController);
    expect(combined.signal.aborted).toBe(false);
  });

  it("should handle multiple aborts gracefully", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    controller1.abort();
    controller2.abort();

    expect(combined.signal.aborted).toBe(true);
  });

  it("should not leak memory when signals are aborted multiple times", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeEventListener1 = vi.spyOn(controller1.signal, "removeEventListener");
    const removeEventListener2 = vi.spyOn(controller2.signal, "removeEventListener");

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    controller1.abort();
    controller2.abort();
    combined.abort();

    const callCount1 = removeEventListener1.mock.calls.length;
    const callCount2 = removeEventListener2.mock.calls.length;

    expect(callCount1).toBeGreaterThan(0);
    expect(callCount2).toBeGreaterThan(0);
  });

  it("should clean up listeners when later signal is already aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    controller2.abort();

    const removeEventListener1 = vi.spyOn(controller1.signal, "removeEventListener");
    const addEventListener1 = vi.spyOn(controller1.signal, "addEventListener");

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.signal.aborted).toBe(true);
    expect(addEventListener1).toHaveBeenCalled();
    expect(removeEventListener1).toHaveBeenCalled();
  });

  it("should clean up listeners when middle signal is already aborted", () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    const controller3 = new AbortController();

    controller2.abort();

    const removeEventListener1 = vi.spyOn(controller1.signal, "removeEventListener");
    const addEventListener1 = vi.spyOn(controller1.signal, "addEventListener");

    const combined = combineAbortSignals(controller1.signal, controller2.signal, controller3.signal);

    expect(combined.signal.aborted).toBe(true);
    expect(addEventListener1).toHaveBeenCalled();
    expect(removeEventListener1).toHaveBeenCalled();
  });
});
