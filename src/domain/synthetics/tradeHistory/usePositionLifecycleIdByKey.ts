import { useEffect, useRef, useState } from "react";

import type { Position } from "sdk/utils/positions/types";

import { fetchPositionLifecycleId } from "./useTradeHistory";

export function usePositionLifecycleIdByKey({
  chainId,
  position,
  onResolve,
}: {
  chainId: number;
  position: Pick<Position, "contractKey" | "increasedAtTime"> | undefined;
  onResolve: (lifecycleId: string | undefined) => void;
}): { isResolving: boolean } {
  const [isResolving, setIsResolving] = useState(false);
  const positionKey = position?.contractKey;
  const increasedAtTime = position?.increasedAtTime;

  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  useEffect(() => {
    if (!positionKey || increasedAtTime === undefined) {
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    fetchPositionLifecycleId({ chainId, positionKey, increasedAtTime })
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
  }, [chainId, positionKey, increasedAtTime]);

  return { isResolving };
}
