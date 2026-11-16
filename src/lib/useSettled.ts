import { useEffect, useState } from "react";

// sources answer at different moments on first load, so a missing one is a loading gap until the value has settled
const DEFAULT_SETTLE_TIMEOUT_MS = 5_000;

export function useSettled(complete: boolean, timeoutMs = DEFAULT_SETTLE_TIMEOUT_MS) {
  const [settled, setSettled] = useState(complete);

  useEffect(() => {
    if (complete) {
      setSettled(true);
      return;
    }
    const timer = setTimeout(() => setSettled(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [complete, timeoutMs]);

  return settled || complete;
}
