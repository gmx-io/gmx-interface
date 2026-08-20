import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitEndpointsUpdated } from "lib/FallbackTracker/events";
import { RpcTracker } from "lib/rpc/RpcTracker";

import { metrics } from "..";
import { subscribeForRpcTrackerMetrics } from "../rpcTrackerMetrics";

const TRACKER_KEY = "RpcTracker.test";

const mockTracker = {
  trackerKey: TRACKER_KEY,
  params: { chainId: 42161 },
} as unknown as RpcTracker;

const emitUpdate = (primary: string, fallbacks: string[]) => {
  emitEndpointsUpdated({
    trackerKey: TRACKER_KEY,
    primary,
    fallbacks,
    endpointsStats: [],
  });
};

describe("subscribeForRpcTrackerMetrics", () => {
  let pushEventSpy: ReturnType<typeof vi.spyOn>;
  let cleanup: () => void;

  beforeEach(() => {
    pushEventSpy = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined) as any;
    cleanup = subscribeForRpcTrackerMetrics(mockTracker);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("emits rpcTracker.endpoint.updated only when the (primary, secondary) pair changes", () => {
    emitUpdate("https://primary.com", ["https://secondary.com", "https://fallback.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(1);

    // Same pair, reordered tail fallbacks — no new event
    emitUpdate("https://primary.com", ["https://secondary.com", "https://other.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(1);

    // Secondary changed — new event
    emitUpdate("https://primary.com", ["https://fallback.com", "https://secondary.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(2);

    // Primary changed — new event
    emitUpdate("https://fallback.com", ["https://fallback.com", "https://secondary.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(3);

    // Back to a previously seen pair, but different from the last reported one — new event
    emitUpdate("https://primary.com", ["https://secondary.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(4);

    expect(pushEventSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: "rpcTracker.endpoint.updated",
        data: expect.objectContaining({
          primary: "primary.com",
          secondary: "secondary.com",
        }),
      })
    );
  });

  it("distinguishes missing secondary from a present one", () => {
    emitUpdate("https://primary.com", []);
    expect(pushEventSpy).toHaveBeenCalledTimes(1);
    expect(pushEventSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ secondary: "none" }) })
    );

    emitUpdate("https://primary.com", []);
    expect(pushEventSpy).toHaveBeenCalledTimes(1);

    emitUpdate("https://primary.com", ["https://secondary.com"]);
    expect(pushEventSpy).toHaveBeenCalledTimes(2);
  });
});
