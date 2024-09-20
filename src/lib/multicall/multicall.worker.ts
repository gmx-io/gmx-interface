import { METRIC_WINDOW_EVENT_NAME } from "lib/metrics/emitMetricEvent";

import { MAX_TIMEOUT, Multicall, MulticallProviderUrls } from "./Multicall";
import type { MulticallRequestConfig } from "./types";

async function executeMulticall(
  chainId: number,
  providerUrls: MulticallProviderUrls,
  request: MulticallRequestConfig<any>,
  abFlags: Record<string, boolean>
) {
  const multicall = await Multicall.getInstance(chainId, abFlags);

  return multicall?.call(providerUrls, request, MAX_TIMEOUT);
}

self.addEventListener("message", run);

async function run(event) {
  const { PRODUCTION_PREVIEW_KEY, chainId, providerUrls, request, id, abFlags } = event.data;
  // @ts-ignore
  self.PRODUCTION_PREVIEW_KEY = PRODUCTION_PREVIEW_KEY;

  try {
    const result = await executeMulticall(chainId, providerUrls, request, abFlags);

    postMessage({
      id,
      result,
    });
  } catch (error) {
    postMessage({
      id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
}

globalThis.addEventListener(METRIC_WINDOW_EVENT_NAME, (event) => {
  postMessage({
    isMetrics: true,
    detail: (event as CustomEvent).detail,
  });
});
