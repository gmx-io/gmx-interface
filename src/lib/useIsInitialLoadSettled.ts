import { useEffect, useState } from "react";

export function useIsInitialLoadSettled(isLoading: boolean, maxWaitMs: number): boolean {
  const [isSettled, setIsSettled] = useState(!isLoading);

  useEffect(() => {
    if (isSettled) return;

    if (!isLoading) {
      setIsSettled(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setIsSettled(true), maxWaitMs);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, isSettled, maxWaitMs]);

  return isSettled;
}
