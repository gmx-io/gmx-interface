import { useEffect, useReducer } from "react";

const UNSTAKE_PAUSE_START_MS = 1793145600 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function useIsUnstakePaused() {
  const [rerenderCount, forceRerender] = useReducer((count: number) => count + 1, 0);
  const isUnstakePaused = Date.now() >= UNSTAKE_PAUSE_START_MS;

  useEffect(() => {
    if (isUnstakePaused) return;

    const timeoutId = window.setTimeout(forceRerender, Math.min(UNSTAKE_PAUSE_START_MS - Date.now(), MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timeoutId);
  }, [isUnstakePaused, rerenderCount]);

  return isUnstakePaused;
}
