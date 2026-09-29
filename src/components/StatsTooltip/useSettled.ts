import { useEffect, useState } from "react";

// sources answer at different moments on first load, so a missing one is a loading gap until the figure has settled
const SETTLE_TIMEOUT_MS = 5_000;

export function useSettled(complete: boolean) {
  const [settled, setSettled] = useState(complete);

  useEffect(() => {
    if (complete) {
      setSettled(true);
      return;
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [complete]);

  return settled || complete;
}
