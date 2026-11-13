import { getIsSolanaNetworkEnabled } from "config/ab";

import { readOrderLifecycle } from "./readOrderLifecycle";
import type { OrderLifecycleResult, TrackedOrderAction } from "./reduceOrderLifecycle";

const POLL_DELAY_MS = 2_000;
const MAX_TRACKING_AGE_MS = 5 * 60_000;

/** An elapsed deadline stops reads, leaving the last outcome unresolved rather than failed. */
export async function watchOrderLifecycle({
  action,
  signal,
  onUpdate,
}: {
  action: TrackedOrderAction;
  signal: AbortSignal;
  onUpdate: (result: OrderLifecycleResult) => void;
}) {
  const deadline = Date.now() + MAX_TRACKING_AGE_MS;
  while (!signal.aborted && getIsSolanaNetworkEnabled()) {
    const result = await readOrderLifecycle({ action, signal });
    if (signal.aborted || !getIsSolanaNetworkEnabled()) return;
    onUpdate(result);
    if (result.execution === "executed" || result.execution === "cancelled" || Date.now() >= deadline) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      const timer = setTimeout(finish, POLL_DELAY_MS);
      signal.addEventListener("abort", finish, { once: true });
      if (signal.aborted) finish();
    });
  }
}
