import isEqual from "lodash/isEqual";
import { useMemo } from "react";
import { usePrevious } from "react-use";

import {
  selectTradeboxSidecarOrdersExistingLimitEntries,
  selectTradeboxSidecarOrdersExistingSlEntries,
  selectTradeboxSidecarOrdersExistingTpEntries,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { InitialEntry } from "./types";


function isEqualOrders(a?: InitialEntry[], b?: InitialEntry[]) {
  return (
    a?.length === b?.length &&
    a?.every((aOrder, index) => {
      const bOrder = b?.[index];
      if (!bOrder) {
        return false;
      }
      return isEqual(aOrder.sizeUsd, bOrder.sizeUsd) && isEqual(aOrder.price, bOrder.price);
    })
  );
}

export function useSidecarOrdersChanged() {
  const existingLimitOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingLimitEntries);
  const existingSlOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingSlEntries);
  const existingTpOrderEntries = useSelector(selectTradeboxSidecarOrdersExistingTpEntries);

  const previousExistingLimitOrderEntries = usePrevious(existingLimitOrderEntries);
  const previousExistingSlOrderEntries = usePrevious(existingSlOrderEntries);
  const previousExistingTpOrderEntries = usePrevious(existingTpOrderEntries);

  return useMemo(
    () =>
      !isEqualOrders(previousExistingLimitOrderEntries, existingLimitOrderEntries) ||
      !isEqualOrders(previousExistingSlOrderEntries, existingSlOrderEntries) ||
      !isEqualOrders(previousExistingTpOrderEntries, existingTpOrderEntries),
    [
      existingLimitOrderEntries,
      existingSlOrderEntries,
      existingTpOrderEntries,
      previousExistingLimitOrderEntries,
      previousExistingSlOrderEntries,
      previousExistingTpOrderEntries,
    ]
  );
}
