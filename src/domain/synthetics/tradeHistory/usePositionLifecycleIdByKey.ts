import { useEffect, useRef, useState } from "react";

import { fetchPositionLifecycleId } from "./useTradeHistory";

// Resolves a position's lifecycle id from its key and reports it via onResolve once settled.
export function usePositionLifecycleIdByKey({
  chainId,
  positionKey,
  onResolve,
}: {
  chainId: number;
  positionKey: string | undefined;
  onResolve: (lifecycleId: string | undefined) => void;
}): { isResolving: boolean } {
  const [isResolving, setIsResolving] = useState(false);

  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  useEffect(() => {
    if (!positionKey) {
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    fetchPositionLifecycleId({ chainId, positionKey })
      .catch(() => undefined)
      .then((lifecycleId) => {
        if (cancelled) {
          return;
        }

        onResolveRef.current(lifecycleId);
        setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chainId, positionKey]);

  return { isResolving };
}
