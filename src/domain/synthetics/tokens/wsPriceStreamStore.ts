import { emitMetricCounter, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import type {
  WsPriceAgeAtSendTiming,
  WsPriceFirstFrameTiming,
  WsPriceInterArrivalTiming,
  WsPriceLatencyTiming,
  WsStreamStatusCounter,
} from "lib/metrics/types";
import { watchPageHidden } from "lib/watchPageHidden";
import type { FrameMeta, GmxApiSdk } from "sdk/clients/v2";

type PriceSubscription = ReturnType<GmxApiSdk["watchTokenPrices"]>;
type WsPrices = NonNullable<ReturnType<PriceSubscription["get"]>>;

export type WsPriceStore = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => WsPrices | undefined;
  getMeta: () => FrameMeta | undefined;
  isLive: () => boolean;
};

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
  let stopWatchingPage: (() => void) | undefined;
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
      emitMetricTiming<WsPriceFirstFrameTiming>({
        event: "wsPrices.firstFrame",
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
    emitMetricTiming<WsPriceLatencyTiming>({
      event: "wsPrices.latency",
      time: meta.receivedAt - meta.serverTs,
      data: { chainId, tokenCount: Object.keys(snapshot).length, byteLength: meta.byteLength },
    });
    if (meta.originTs !== undefined) {
      emitMetricTiming<WsPriceAgeAtSendTiming>({
        event: "wsPrices.ageAtSend",
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
    next.subscribeConnectionStatus((status) => {
      notify();
      if (!document.hidden) {
        emitMetricCounter<WsStreamStatusCounter>({ event: "wsPrices.status", data: { chainId, status } });
      }
    });
  };

  const close = () => {
    if (!subscription) {
      return;
    }
    subscription.close();
    subscription = undefined;
    snapshot = undefined;
    meta = undefined;
    notify();
  };

  const teardown = () => {
    teardownTimer = undefined;
    stopWatchingPage?.();
    stopWatchingPage = undefined;
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
        stopWatchingPage = watchPageHidden({
          onHiddenLong: close,
          onShow: () => {
            if (refCount > 0) {
              open();
            }
          },
        });
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
    isLive: () => subscription?.connectionStatus === "live",
  };

  stores.set(sdk, store);
  return store;
}
