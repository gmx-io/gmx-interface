import { useCallback, useMemo, useState } from "react";

import { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/useSidecarOrders";

export type SidecarOrdersState = ReturnType<typeof useSidecarOrdersState>;

export function useSidecarOrdersState() {
  const [slEntries, setSlEntries] = useState<SidecarOrderEntry[]>([]);
  const [tpEntries, setTpEntries] = useState<SidecarOrderEntry[]>([]);
  const [limitEntries, setLimitEntries] = useState<SidecarOrderEntry[]>([]);

  const [slEntriesIsUntouched, setSlEntriesIsUntouched] = useState<boolean>(true);
  const [tpEntriesIsUntouched, setTpEntriesIsUntouched] = useState<boolean>(true);
  const [limitEntriesIsUntouched, setLimitEntriesIsUntouched] = useState<boolean>(true);

  const setIsUntouched = useCallback(
    (group: "tp" | "sl" | "limit", value: boolean) => {
      if (group === "tp") {
        setTpEntriesIsUntouched(value);
      } else if (group === "sl") {
        setSlEntriesIsUntouched(value);
      } else {
        setLimitEntriesIsUntouched(value);
      }
    },
    [setTpEntriesIsUntouched, setSlEntriesIsUntouched, setLimitEntriesIsUntouched]
  );

  return useMemo(
    () => ({
      slEntries,
      setSlEntries,
      tpEntries,
      setTpEntries,
      limitEntries,
      setLimitEntries,
      slEntriesIsUntouched,
      tpEntriesIsUntouched,
      limitEntriesIsUntouched,
      setIsUntouched,
    }),
    [
      slEntries,
      tpEntries,
      limitEntries,
      setSlEntries,
      setTpEntries,
      setLimitEntries,
      slEntriesIsUntouched,
      tpEntriesIsUntouched,
      limitEntriesIsUntouched,
      setIsUntouched,
    ]
  );
}
