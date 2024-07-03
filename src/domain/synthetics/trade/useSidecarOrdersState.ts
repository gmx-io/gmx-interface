import { useCallback, useMemo, useState } from "react";

import { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/useSidecarOrders";

export type SidecarOrdersState = ReturnType<typeof useSidecarOrdersState>;

export function useSidecarOrdersState() {
  const [slEntries, setSlEntries] = useState<SidecarOrderEntry[]>([]);
  const [tpEntries, setTpEntries] = useState<SidecarOrderEntry[]>([]);
  const [limitEntries, setLimitEntries] = useState<SidecarOrderEntry[]>([]);

  const [slEntriesPristine, setSlEntriesPristine] = useState<boolean>(true);
  const [tpEntriesPristine, setTpEntriesPristine] = useState<boolean>(true);
  const [limitEntriesPristine, setLimitEntriesPristine] = useState<boolean>(true);

  const setPristine = useCallback(
    (group: "tp" | "sl" | "limit", value: boolean) => {
      if (group === "tp") {
        setTpEntriesPristine(value);
      } else if (group === "sl") {
        setSlEntriesPristine(value);
      } else {
        setLimitEntriesPristine(value);
      }
    },
    [setTpEntriesPristine, setSlEntriesPristine, setLimitEntriesPristine]
  );

  return useMemo(
    () => ({
      slEntries,
      setSlEntries,
      tpEntries,
      setTpEntries,
      limitEntries,
      setLimitEntries,
      slEntriesPristine,
      tpEntriesPristine,
      limitEntriesPristine,
      setPristine,
    }),
    [
      slEntries,
      tpEntries,
      limitEntries,
      setSlEntries,
      setTpEntries,
      setLimitEntries,
      slEntriesPristine,
      tpEntriesPristine,
      limitEntriesPristine,
      setPristine,
    ]
  );
}
