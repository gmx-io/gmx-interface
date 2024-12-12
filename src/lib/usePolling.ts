import { useEffect, useState } from "react";

export function usePolling<T>(
  fn: () => Promise<T>,
  { interval, retries, deps }: { interval: number; retries: number; deps: any[] }
) {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let timeoutId: number;

    const poll = async () => {
      const result = await fn().catch(() => {
        return undefined;
      });

      if (result) {
        setData(result);
        return;
      }

      if (retries > 0) {
        retries--;
        timeoutId = window.setTimeout(poll, interval);
      }
    };

    poll();

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, retries, ...deps]);

  return { data };
}
