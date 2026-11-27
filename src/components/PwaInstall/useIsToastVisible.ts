import { useSyncExternalStore } from "react";
import { toast } from "react-toastify";

const activeToastIds = new Set<string | number>();
const listeners = new Set<() => void>();
let isAnyToastVisible = false;
let isSubscribed = false;

function startTracking() {
  if (isSubscribed) return;
  isSubscribed = true;
  toast.onChange((item) => {
    if (item.status === "removed") {
      activeToastIds.delete(item.id);
    } else {
      activeToastIds.add(item.id);
    }
    const next = activeToastIds.size > 0;
    if (next !== isAnyToastVisible) {
      isAnyToastVisible = next;
      listeners.forEach((listener) => listener());
    }
  });
}

function subscribe(listener: () => void) {
  startTracking();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while any GMX toast (order status, transaction) is on screen. The nudges wait so they never cover one. */
export function useIsToastVisible() {
  return useSyncExternalStore(
    subscribe,
    () => isAnyToastVisible,
    () => false
  );
}
