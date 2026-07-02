import { useEffect, useRef, useSyncExternalStore } from "react";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { emitMetricCounter, emitMetricTiming } from "lib/metrics/emitMetricEvent";
import type {
  WsPriceFirstTickTiming,
  WsPriceFreshnessTiming,
  WsPriceInterArrivalTiming,
  WsPriceTickTiming,
  WsStreamStatusCounter,
} from "lib/metrics/types";
import type { StreamStatus } from "sdk/clients/v2";
import type { ContractsChainId } from "sdk/configs/chains";

import { getWsPriceStore } from "./wsPriceStreamStore";
import { API_UI_FLAGS, useIsApiSdkEnabled } from "../uiFlags/useIsApiSdkEnabled";

const METRIC_SAMPLE_EVERY = 10;

const noopSubscribe = () => () => undefined;
const noopSnapshot = () => undefined;
const noopStatus = (): StreamStatus => "closed";

export function useWsPriceOverlay(chainId: ContractsChainId) {
  const sdk = useGmxSdk(chainId);
  const enabled = useIsApiSdkEnabled(API_UI_FLAGS.wsPrices);

  const store = enabled && sdk ? getWsPriceStore(sdk) : undefined;

  const prices = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getSnapshot : noopSnapshot
  );
  const status = useSyncExternalStore(
    store ? store.subscribeStatus : noopSubscribe,
    store ? store.getStatus : noopStatus
  );

  const tickRef = useRef(0);
  const firstSeenRef = useRef(false);
  const lastFrameAtRef = useRef(0);
  const subscribedAtRef = useRef(0);

  useEffect(() => {
    subscribedAtRef.current = store ? Date.now() : 0;
    firstSeenRef.current = false;
    lastFrameAtRef.current = 0;
    tickRef.current = 0;
  }, [store]);

  useEffect(() => {
    if (!store || !prices) {
      return;
    }
    const meta = store.getMeta();
    const now = Date.now();

    if (!firstSeenRef.current) {
      firstSeenRef.current = true;
      if (subscribedAtRef.current) {
        emitMetricTiming<WsPriceFirstTickTiming>({
          event: "wsPrices.firstTick",
          time: now - subscribedAtRef.current,
          data: { chainId },
        });
      }
    }

    if (lastFrameAtRef.current) {
      emitMetricTiming<WsPriceInterArrivalTiming>({
        event: "wsPrices.interArrival",
        time: now - lastFrameAtRef.current,
        data: { chainId },
      });
    }
    lastFrameAtRef.current = now;

    tickRef.current += 1;
    if (tickRef.current % METRIC_SAMPLE_EVERY === 0 && meta) {
      emitMetricTiming<WsPriceTickTiming>({
        event: "wsPrices.tick",
        time: meta.receivedAt - meta.serverTs,
        data: {
          chainId,
          tokenCount: Object.keys(prices).length,
          byteLength: meta.byteLength,
          status: store.getStatus(),
        },
      });
      if (meta.originTs !== undefined) {
        emitMetricTiming<WsPriceFreshnessTiming>({
          event: "wsPrices.freshness",
          time: meta.receivedAt - meta.originTs,
          data: { chainId },
        });
      }
    }
  }, [prices, store, chainId]);

  const prevStatusRef = useRef<StreamStatus | undefined>(undefined);
  useEffect(() => {
    if (!store) {
      prevStatusRef.current = undefined;
      return;
    }
    if (prevStatusRef.current !== undefined && prevStatusRef.current !== status) {
      emitMetricCounter<WsStreamStatusCounter>({
        event: "wsPrices.status",
        data: { chainId, status },
      });
    }
    prevStatusRef.current = status;
  }, [status, store, chainId]);

  return { prices, status };
}
