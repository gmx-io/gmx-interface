import { useMemo } from "react";

import { SidecarLimitOrderEntryValid, SidecarSlTpOrderEntryValid } from "domain/synthetics/sidecarOrders/types";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";

export function useRequiredActions() {
  const sidecarEntries = useSidecarEntries();

  const { cancelSltpEntries, createSltpEntries, updateSltpEntries } = useMemo(() => {
    const [cancelSltpEntries, createSltpEntries, updateSltpEntries] = sidecarEntries.reduce(
      ([cancel, create, update], e) => {
        if (e.txnType === "cancel") cancel.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        if (e.txnType === "create" && !!e.decreaseAmounts) create.push(e as SidecarSlTpOrderEntryValid);
        if (e.txnType === "update" && (!!e.decreaseAmounts || !!e.increaseAmounts))
          update.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        return [cancel, create, update];
      },
      [[], [], []] as [
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
        SidecarSlTpOrderEntryValid[],
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
      ]
    );

    return { cancelSltpEntries, createSltpEntries, updateSltpEntries };
  }, [sidecarEntries]);

  const requiredActions = 1 + cancelSltpEntries.length + createSltpEntries.length + updateSltpEntries.length;

  return {
    requiredActions,
    cancelSltpEntries,
    createSltpEntries,
    updateSltpEntries,
  };
}
