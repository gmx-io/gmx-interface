import { METRIC_WINDOW_EVENT_NAME } from "lib/metrics/emitMetricEvent";

import { MAX_TIMEOUT, Multicall } from "./Multicall";
import type { MulticallRequestConfig } from "./types";

async function executeMulticall(
  chainId: number,
  request: MulticallRequestConfig<any>,
  abFlags: Record<string, boolean>
) {
  const multicall = await Multicall.getInstance(chainId, abFlags);

  return multicall?.call(request, MAX_TIMEOUT);
}

self.addEventListener("message", run);

async function run(event) {
  const { PRODUCTION_PREVIEW_KEY, chainId, request, id, abFlags } = event.data;
  // @ts-ignore
  self.PRODUCTION_PREVIEW_KEY = PRODUCTION_PREVIEW_KEY;

  try {
    const result = await executeMulticall(chainId, request, abFlags);

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
