import { isDevelopment } from "config/env";
import { getIsMulticallBatchingDisabledKey, getMulticallBatchingLoggingEnabledKey } from "config/localStorage";

// Debugging
//
// To disable multicall batching:
// localStorage.setItem(`["debug-multicall-batching","disabled"]`, "1");
// To re-enable multicall batching:
// localStorage.removeItem(`["debug-multicall-batching","disabled"]`);
//
// To enable multicall batching logging:
// localStorage.setItem(`["debug-multicall-batching","logging"]`, "1");
// To disable multicall batching logging:
// localStorage.removeItem(`["debug-multicall-batching","logging"]`);

export function getIsMulticallBatchingDisabled() {
  const key = JSON.stringify(getIsMulticallBatchingDisabledKey());
  return Boolean(localStorage.getItem(key));
}

function getMulticallBatchingLoggingEnabled() {
  const key = JSON.stringify(getMulticallBatchingLoggingEnabledKey());
  return Boolean(localStorage.getItem(key));
}

export function debugLog(messenger: () => string | void) {
  if (isDevelopment() && getMulticallBatchingLoggingEnabled()) {
    const message = messenger();

    if (!message) {
      return;
    }

    // eslint-disable-next-line no-console
    console.debug(`[multicall] ${message}`);
  }
}
