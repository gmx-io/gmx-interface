import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics, MetricEventParams } from "./Metrics";

function makeCoalescedParams(errorMessage: string): MetricEventParams {
  return {
    event: "multicall.error",
    isError: true,
    data: { errorMessage, rpcProvider: "alchemy", requestType: "initial", isInMainThread: true },
  };
}

function getQueuedEventPayloads() {
  return metrics.queue.flatMap((item) => (item.type === "event" ? [item.payload] : []));
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

describe("Metrics coalescing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    metrics.queue = [];
    for (const bucket of metrics.coalescedBuckets.values()) {
      window.clearTimeout(bucket.timeoutId);
    }
    metrics.coalescedBuckets.clear();
    setVisibilityState("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends non-coalesced events immediately", () => {
    metrics.pushEvent<MetricEventParams>({ event: "some.event", data: {} });
    metrics.pushEvent<MetricEventParams>({ event: "some.event", data: {} });

    expect(getQueuedEventPayloads()).toHaveLength(2);
  });

  it("sends the first coalesced event immediately and folds identical repeats into one summary", () => {
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));

    expect(getQueuedEventPayloads()).toHaveLength(1);

    vi.advanceTimersByTime(60_000);

    const payloads = getQueuedEventPayloads();
    expect(payloads).toHaveLength(2);
    expect(payloads[1].event).toBe("multicall.error");
    expect(payloads[1].isError).toBe(true);
    expect(payloads[1].customFields.repeatCount).toBe(2);
  });

  it("does not fold events that differ in a key field", () => {
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("other"));

    expect(getQueuedEventPayloads()).toHaveLength(2);
  });

  it("flushes a bucket with no repeats silently", () => {
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));

    vi.advanceTimersByTime(60_000);

    expect(getQueuedEventPayloads()).toHaveLength(1);
    expect(metrics.coalescedBuckets.size).toBe(0);
  });

  it("timestamps firstSuppressedAt at the first suppressed repeat, not the sent event", () => {
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));
    vi.advanceTimersByTime(10_000);
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));

    vi.advanceTimersByTime(50_000);

    const payloads = getQueuedEventPayloads();
    expect(payloads).toHaveLength(2);
    expect(payloads[1].customFields.firstSuppressedAt).toBe(payloads[1].customFields.lastSuppressedAt);
  });

  it("holds even the first event in a hidden tab and delivers it on the visibility flush", () => {
    setVisibilityState("hidden");
    metrics.pushEvent<MetricEventParams>(makeCoalescedParams("boom"));

    expect(getQueuedEventPayloads()).toHaveLength(0);

    setVisibilityState("visible");
    metrics.handleVisibilityChange();

    const payloads = getQueuedEventPayloads();
    expect(payloads).toHaveLength(1);
    expect(payloads[0].customFields.repeatCount).toBe(1);
  });
});

describe("Metrics ignored errors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    metrics.queue = [];
    for (const bucket of metrics.coalescedBuckets.values()) {
      window.clearTimeout(bucket.timeoutId);
    }
    metrics.coalescedBuckets.clear();
    setVisibilityState("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops AbortError and known browser-noise errors", () => {
    const abortError = new Error("signal is aborted without reason");
    abortError.name = "AbortError";

    metrics.pushError(abortError, "test");
    metrics.pushError(new Error("The user aborted a request."), "test");
    metrics.pushError(new Error("The operation was aborted."), "test");
    metrics.pushError(new Error("can't access dead object"), "test");

    expect(getQueuedEventPayloads()).toHaveLength(0);
  });

  it("still reports real errors", () => {
    metrics.pushError(new Error("real failure"), "test");

    expect(getQueuedEventPayloads()).toHaveLength(1);
  });
});
