import type { FrameMeta, GmxApiSdk, StreamStatus } from "sdk/clients/v2";

type PriceSubscription = ReturnType<GmxApiSdk["watchTokenPrices"]>;
type WsPrices = NonNullable<ReturnType<PriceSubscription["get"]>>;

export type WsPriceStore = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => WsPrices | undefined;
  getMeta: () => FrameMeta | undefined;
  subscribeStatus: (onChange: () => void) => () => void;
  getStatus: () => StreamStatus;
};

const stores = new WeakMap<GmxApiSdk, WsPriceStore>();

export function getWsPriceStore(sdk: GmxApiSdk): WsPriceStore {
  const existing = stores.get(sdk);
  if (existing) {
    return existing;
  }

  let subscription: PriceSubscription | undefined;
  let snapshot: WsPrices | undefined;
  let meta: FrameMeta | undefined;
  let status: StreamStatus = "closed";
  let refCount = 0;
  let unsubscribeStatus: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const statusListeners = new Set<() => void>();

  const notifyStatus = () => {
    for (const listener of statusListeners) {
      listener();
    }
  };

  const ensureSubscription = () => {
    if (subscription) {
      return;
    }
    subscription = sdk.watchTokenPrices();
    status = subscription.status;
    subscription.subscribe(() => {
      snapshot = subscription?.get();
      meta = subscription?.getMeta();
      for (const listener of listeners) {
        listener();
      }
    });
    unsubscribeStatus = subscription.subscribeStatus((next) => {
      status = next;
      notifyStatus();
    });
  };

  const teardown = () => {
    unsubscribeStatus?.();
    unsubscribeStatus = undefined;
    subscription?.close();
    subscription = undefined;
    snapshot = undefined;
    meta = undefined;
    if (status !== "closed") {
      status = "closed";
      notifyStatus();
    }
  };

  const store: WsPriceStore = {
    subscribe(onChange) {
      ensureSubscription();
      listeners.add(onChange);
      refCount += 1;
      return () => {
        listeners.delete(onChange);
        refCount -= 1;
        if (refCount === 0) {
          teardown();
        }
      };
    },
    getSnapshot: () => snapshot,
    getMeta: () => meta,
    subscribeStatus(onChange) {
      statusListeners.add(onChange);
      return () => {
        statusListeners.delete(onChange);
      };
    },
    getStatus: () => status,
  };

  stores.set(sdk, store);
  return store;
}
