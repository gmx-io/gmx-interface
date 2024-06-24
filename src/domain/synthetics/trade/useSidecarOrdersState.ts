import { useMemo, useState } from "react";

import { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/useSidecarOrders";

export type SidecarOrdersState = ReturnType<typeof useSidecarOrdersState>;

export function useSidecarOrdersState() {
  const [slEntries, setSlEntries] = useState<SidecarOrderEntry[]>([]);
  const [tpEntries, setTpEntries] = useState<SidecarOrderEntry[]>([]);
  const [limitEntries, setLimitEntries] = useState<SidecarOrderEntry[]>([]);

  return useMemo(
    () => ({
      slEntries,
      setSlEntries,
      tpEntries,
      setTpEntries,
      limitEntries,
      setLimitEntries,
    }),
    [slEntries, tpEntries, limitEntries, setSlEntries, setTpEntries, setLimitEntries]
  );
}
