import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { FrameMeta, GmxApiSdk, StreamConnectionStatus } from "sdk/clients/v2";

import { getWsPriceStore } from "./wsPriceStreamStore";

function createFakeSubscription() {
  let onFrame: (() => void) | undefined;
  let onConnectionStatus: ((status: StreamConnectionStatus) => void) | undefined;
  let prices: Record<string, { minPrice: bigint; maxPrice: bigint }> | undefined;
  let meta: FrameMeta | undefined;

  return {
    closed: false,
    connectionStatus: "live" as StreamConnectionStatus,
    get: () => prices,
    getMeta: () => meta,
    subscribe: (listener: () => void) => {
      onFrame = listener;
      return () => undefined;
    },
    subscribeConnectionStatus: (listener: (status: StreamConnectionStatus) => void) => {
      onConnectionStatus = listener;
      return () => undefined;
    },
    close() {
      this.closed = true;
    },
    pushFrame(nextPrices: typeof prices, nextMeta: FrameMeta) {
      prices = nextPrices;
      meta = nextMeta;
      onFrame?.();
    },
    setConnectionStatus(status: StreamConnectionStatus) {
      this.connectionStatus = status;
      onConnectionStatus?.(status);
    },
  };
}

function createFakeSdk() {
  const subscriptions: ReturnType<typeof createFakeSubscription>[] = [];
  const watchTokenPrices = vi.fn(() => {
    const subscription = createFakeSubscription();
    subscriptions.push(subscription);
    return subscription;
  });
  const sdk = { ctx: { chainId: ARBITRUM }, watchTokenPrices } as unknown as GmxApiSdk;
  return { sdk, subscriptions };
}

describe("getWsPriceStore", () => {
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    { name: "opens nothing without a subscriber", steps: [], opened: 0, open: 0 },
    { name: "shares one stream across subscribers", steps: ["sub", "sub"], opened: 1, open: 1 },
    { name: "reuses the stream within 3 s", steps: ["sub", "unsub", 2_999, "sub"], opened: 1, open: 1 },
    { name: "closes 3 s after the last subscriber leaves", steps: ["sub", "unsub", 3_000], opened: 1, open: 0 },
    { name: "reopens for the next subscriber", steps: ["sub", "unsub", 3_000, "sub"], opened: 2, open: 1 },
    { name: "keeps the stream through a short hide", steps: ["sub", "hide", 9_999, "show"], opened: 1, open: 1 },
    { name: "closes after 10 s hidden", steps: ["sub", "hide", 10_000], opened: 1, open: 0 },
    { name: "reopens when shown again", steps: ["sub", "hide", 10_000, "show"], opened: 2, open: 1 },
    { name: "does not open while the page is hidden", steps: ["hide", "sub"], opened: 0, open: 0 },
    { name: "opens when shown after subscribing while hidden", steps: ["hide", "sub", "show"], opened: 1, open: 1 },
  ] as const)("$name", ({ steps, opened, open }) => {
    const { sdk, subscriptions } = createFakeSdk();
    const store = getWsPriceStore(sdk);
    const unsubscribers: (() => void)[] = [];

    for (const step of steps) {
      if (typeof step === "number") {
        vi.advanceTimersByTime(step);
      } else if (step === "sub") {
        unsubscribers.push(store.subscribe(vi.fn()));
      } else if (step === "unsub") {
        unsubscribers.pop()?.();
      } else {
        hidden = step === "hide";
        EventTarget.prototype.dispatchEvent.call(document, new Event("visibilitychange"));
      }
    }

    expect(subscriptions.length).toBe(opened);
    expect(subscriptions.filter((subscription) => !subscription.closed).length).toBe(open);
  });

  it("hands each frame to subscribers and drops it once the stream closes", () => {
    const { sdk, subscriptions } = createFakeSdk();
    const store = getWsPriceStore(sdk);
    const onChange = vi.fn();
    store.subscribe(onChange);
    const prices = { "0xabc": { minPrice: 1n, maxPrice: 2n } };
    const meta = { serverTs: 2, originTs: 1, receivedAt: 3, byteLength: 4 };

    subscriptions[0].pushFrame(prices, meta);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual(prices);
    expect(store.getMeta()).toEqual(meta);

    hidden = true;
    EventTarget.prototype.dispatchEvent.call(document, new Event("visibilitychange"));
    vi.advanceTimersByTime(10_000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toBeUndefined();
    expect(store.getMeta()).toBeUndefined();
  });

  it("reports live only while the socket is live and notifies on each change", () => {
    const { sdk, subscriptions } = createFakeSdk();
    const store = getWsPriceStore(sdk);
    const onChange = vi.fn();
    store.subscribe(onChange);
    expect(store.isLive()).toBe(true);

    subscriptions[0].setConnectionStatus("reconnecting");
    expect(store.isLive()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);

    subscriptions[0].setConnectionStatus("live");
    expect(store.isLive()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
