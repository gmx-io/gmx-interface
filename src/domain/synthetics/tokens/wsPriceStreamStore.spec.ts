import { describe, expect, it, vi } from "vitest";

import type { GmxApiSdk, StreamStatus } from "sdk/clients/v2";

import { getWsPriceStore } from "./wsPriceStreamStore";

type PriceMap = Record<string, { minPrice: bigint; maxPrice: bigint }>;
type Meta = { serverTs: number; receivedAt: number; byteLength: number; originTs?: number };

function createFakeSubscription() {
  let value: PriceMap | undefined;
  let meta: Meta | undefined;
  let listener: ((value: unknown) => void) | undefined;
  let statusListener: ((status: StreamStatus) => void) | undefined;

  return {
    status: "live" as StreamStatus,
    get: () => value,
    getMeta: () => meta,
    subscribe: (l: (value: unknown) => void) => {
      listener = l;
      return () => undefined;
    },
    subscribeStatus: (l: (status: StreamStatus) => void) => {
      statusListener = l;
      return () => undefined;
    },
    close: vi.fn(),
    push(nextValue: PriceMap, nextMeta: Meta) {
      value = nextValue;
      meta = nextMeta;
      listener?.(nextValue);
    },
    pushStatus(next: StreamStatus) {
      statusListener?.(next);
    },
  };
}

function createFakeSdk() {
  const sub = createFakeSubscription();
  const watchTokenPrices = vi.fn(() => sub);
  const sdk = { watchTokenPrices } as unknown as GmxApiSdk;
  return { sdk, sub, watchTokenPrices };
}

const meta = (serverTs: number): Meta => ({ serverTs, receivedAt: serverTs + 2, byteLength: 100 });
const prices = (min: bigint): PriceMap => ({ "0xtoken": { minPrice: min, maxPrice: min + 1n } });

describe("getWsPriceStore", () => {
  it("opens one subscription lazily on first subscribe and streams snapshots", () => {
    const { sdk, sub, watchTokenPrices } = createFakeSdk();
    const store = getWsPriceStore(sdk);

    expect(watchTokenPrices).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBeUndefined();

    const onChange = vi.fn();
    store.subscribe(onChange);
    expect(watchTokenPrices).toHaveBeenCalledTimes(1);

    sub.push(prices(100n), meta(1000));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual(prices(100n));
    expect(store.getMeta()).toEqual(meta(1000));
    expect(store.getStatus()).toBe("live");
  });

  it("shares one underlying subscription across multiple subscribers", () => {
    const { sdk, sub, watchTokenPrices } = createFakeSdk();
    const store = getWsPriceStore(sdk);
    const a = vi.fn();
    const b = vi.fn();

    store.subscribe(a);
    store.subscribe(b);
    expect(watchTokenPrices).toHaveBeenCalledTimes(1);

    sub.push(prices(200n), meta(2000));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("forwards status changes to status subscribers", () => {
    const { sdk, sub } = createFakeSdk();
    const store = getWsPriceStore(sdk);

    const onStatus = vi.fn();
    store.subscribe(vi.fn());
    store.subscribeStatus(onStatus);

    expect(store.getStatus()).toBe("live");

    sub.pushStatus("reconnecting");
    expect(onStatus).toHaveBeenCalledTimes(1);
    expect(store.getStatus()).toBe("reconnecting");
  });

  it("closes on last unsubscribe and reopens on next subscribe", () => {
    const { sdk, sub, watchTokenPrices } = createFakeSdk();
    const store = getWsPriceStore(sdk);

    const unsubA = store.subscribe(vi.fn());
    const unsubB = store.subscribe(vi.fn());

    unsubA();
    expect(sub.close).not.toHaveBeenCalled();

    unsubB();
    expect(sub.close).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBeUndefined();
    expect(store.getStatus()).toBe("closed");

    store.subscribe(vi.fn());
    expect(watchTokenPrices).toHaveBeenCalledTimes(2);
  });

  it("returns a stable store per sdk instance", () => {
    const { sdk } = createFakeSdk();
    expect(getWsPriceStore(sdk)).toBe(getWsPriceStore(sdk));
  });
});
