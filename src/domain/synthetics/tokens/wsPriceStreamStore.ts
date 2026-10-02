import { emitMetricCounter, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import type {
  WsPriceFirstTickTiming,
  WsPriceFreshnessTiming,
  WsPriceInterArrivalTiming,
  WsPriceTickTiming,
  WsStreamStatusCounter,
} from "lib/metrics/types";
import type { FrameMeta, GmxApiSdk } from "sdk/clients/v2";

type PriceSubscription = ReturnType<GmxApiSdk["watchTokenPrices"]>;
type WsPrices = NonNullable<ReturnType<PriceSubscription["get"]>>;

export type WsPriceStore = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => WsPrices | undefined;
  getMeta: () => FrameMeta | undefined;
};

export const HIDDEN_CLOSE_DELAY_MS = 10_000;
const TEARDOWN_DELAY_MS = 3_000;
const METRIC_SAMPLE_EVERY = 10;

const stores = new WeakMap<GmxApiSdk, WsPriceStore>();

export function getWsPriceStore(sdk: GmxApiSdk): WsPriceStore {
  const existing = stores.get(sdk);
  if (existing) {
    return existing;
  }

  const chainId = sdk.ctx.chainId;
  let subscription: PriceSubscription | undefined;
  let snapshot: WsPrices | undefined;
  let meta: FrameMeta | undefined;
  let refCount = 0;
  let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
  let teardownTimer: ReturnType<typeof setTimeout> | undefined;
  let openedAt = 0;
  let frameCount = 0;
  let lastFrameAt = 0;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const reportFrame = () => {
    const now = Date.now();
    const previousFrameAt = lastFrameAt;
    lastFrameAt = now;
    frameCount += 1;

    if (document.hidden || !snapshot || !meta) {
      return;
    }

    if (frameCount === 1) {
      emitMetricTiming<WsPriceFirstTickTiming>({
        event: "wsPrices.firstTick",
        time: now - openedAt,
        data: { chainId },
      });
    }

    if (frameCount % METRIC_SAMPLE_EVERY !== 0) {
      return;
    }

    emitMetricTiming<WsPriceInterArrivalTiming>({
      event: "wsPrices.interArrival",
      time: now - previousFrameAt,
      data: { chainId },
    });
    emitMetricTiming<WsPriceTickTiming>({
      event: "wsPrices.tick",
      time: meta.receivedAt - meta.serverTs,
      data: { chainId, tokenCount: Object.keys(snapshot).length, byteLength: meta.byteLength },
    });
    if (meta.originTs !== undefined) {
      emitMetricTiming<WsPriceFreshnessTiming>({
        event: "wsPrices.freshness",
        time: meta.serverTs - meta.originTs,
        data: { chainId },
      });
    }
  };

  const open = () => {
    if (subscription || document.hidden) {
      return;
    }
    const next = sdk.watchTokenPrices();
    subscription = next;
    openedAt = Date.now();
    frameCount = 0;
    next.subscribe(() => {
      snapshot = next.get();
      meta = next.getMeta();
      reportFrame();
      notify();
    });
    next.subscribeStatus((status) => {
      if (!document.hidden) {
        emitMetricCounter<WsStreamStatusCounter>({ event: "wsPrices.status", data: { chainId, status } });
      }
    });
  };

  const close = () => {
    clearTimeout(hiddenTimer);
    hiddenTimer = undefined;
    if (!subscription) {
      return;
    }
    subscription.close();
    subscription = undefined;
    snapshot = undefined;
    meta = undefined;
    notify();
  };

  const onVisibilityChange = () => {
    if (!document.hidden) {
      clearTimeout(hiddenTimer);
      hiddenTimer = undefined;
      if (refCount > 0) {
        open();
      }
    } else if (subscription && !hiddenTimer) {
      hiddenTimer = setTimeout(close, HIDDEN_CLOSE_DELAY_MS);
    }
  };

  const teardown = () => {
    teardownTimer = undefined;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    close();
  };

  const store: WsPriceStore = {
    subscribe(onChange) {
      listeners.add(onChange);
      refCount += 1;
      if (teardownTimer) {
        clearTimeout(teardownTimer);
        teardownTimer = undefined;
      } else if (refCount === 1) {
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
      open();
      return () => {
        listeners.delete(onChange);
        refCount -= 1;
        if (refCount === 0) {
          teardownTimer = setTimeout(teardown, TEARDOWN_DELAY_MS);
        }
      };
    },
    getSnapshot: () => snapshot,
    getMeta: () => meta,
  };

  stores.set(sdk, store);
  return store;
}
