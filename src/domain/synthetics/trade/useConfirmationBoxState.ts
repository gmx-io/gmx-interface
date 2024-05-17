import { useMemo } from "react";
import { useSidecarOrdersState } from "./useSidecarOrdersState";

export type ConfirmationBoxState = ReturnType<typeof useConfirmationBoxState>;

export function useConfirmationBoxState() {
  const sidecarOrders = useSidecarOrdersState();

  return useMemo(
    () => ({
      sidecarOrders,
    }),
    [sidecarOrders]
  );
}
