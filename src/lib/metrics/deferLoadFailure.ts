import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";

import { metrics } from "./Metrics";
import type { FallbackWaitEnd, LoadFallbackOutcome, LoadingFailedEvent } from "./types";

export type DeferredLoadFailure = {
  onLoaded: () => void;
  finish: (end: FallbackWaitEnd) => void;
};

const pendingFailures = new Set<DeferredLoadFailure>();
let isSubscribedToPageExit = false;

function finishPendingFailures(end: FallbackWaitEnd) {
  pendingFailures.forEach((failure) => failure.finish(end));
  metrics.sendReleasedDeferredEvents({ keepalive: true });
}

function subscribeToPageExit() {
  if (isSubscribedToPageExit) {
    return;
  }

  isSubscribedToPageExit = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      finishPendingFailures("pageHidden");
    }
  });
  window.addEventListener("pagehide", () => finishPendingFailures("pageLeft"));
}

export function deferLoadFailure(event: LoadingFailedEvent, onFinish?: () => void): DeferredLoadFailure {
  const failedAt = Date.now();
  const deferredEvent = metrics.deferEvent(event);
  const failure: DeferredLoadFailure = {
    onLoaded: () => {
      finish("loaded");
      queueMicrotask(() => {
        if (!metrics.isSendFailing) {
          metrics.sendReleasedDeferredEvents({ keepalive: true });
        }
      });
    },
    finish,
  };
  const timeoutId = window.setTimeout(() => finish("timeout"), DATA_LOAD_TIMEOUT_FOR_METRICS);

  pendingFailures.add(failure);
  subscribeToPageExit();

  function finish(end: FallbackWaitEnd) {
    if (!pendingFailures.delete(failure)) {
      return;
    }

    window.clearTimeout(timeoutId);

    const outcome: LoadFallbackOutcome = {
      fallbackLoaded: end === "loaded",
      fallbackTime: Date.now() - failedAt,
      fallbackWaitEnd: end,
    };

    metrics.releaseDeferredEvent(deferredEvent, outcome);
    onFinish?.();
  }

  return failure;
}
