import { useEffect, useSyncExternalStore } from "react";

let blockersCount = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return blockersCount > 0;
}

function changeBlockersCount(delta: number) {
  const wasBlocked = getSnapshot();
  blockersCount = Math.max(0, blockersCount + delta);

  if (wasBlocked !== getSnapshot()) {
    listeners.forEach((listener) => listener());
  }
}

/** Marks work a reload would throw away. It holds back the silent reload, not the offer. */
export function useBlockAutoReload(isBlocking: boolean) {
  useEffect(() => {
    if (!isBlocking) {
      return;
    }

    changeBlockersCount(1);
    return () => changeBlockersCount(-1);
  }, [isBlocking]);
}

export function useIsAutoReloadBlocked() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
