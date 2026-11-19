import { useEffect, useState } from "react";

// Current time in unix seconds, updated every second while `enabled` (for countdowns).
export function useNowSeconds(enabled = true) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!enabled) return;
    setNow(Math.floor(Date.now() / 1000));
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return now;
}
