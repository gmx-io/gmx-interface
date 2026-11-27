import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { useSendCancelOrdersTxn } from "domain/synthetics/orders/useSendCancelOrdersTxn";
import { helperToast } from "lib/helperToast";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { OrderInfo } from "sdk/utils/orders/types";

import { useCancellingOrdersKeysState } from "./orderEditorHooks";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrdersWithErrorsByPositionKey,
  selectOrderErrorsCount,
} from "../selectors/orderSelectors";
import { useSelector } from "../utils";

export const useOrderErrors = (orderKey: string) => {
  const selector = useMemo(() => makeSelectOrderErrorByOrderKey(orderKey), [orderKey]);
  return useSelector(selector);
};

export const usePositionOrdersWithErrors = (positionKey: string | undefined) => {
  const selector = useMemo(() => makeSelectOrdersWithErrorsByPositionKey(positionKey), [positionKey]);
  return useSelector(selector);
};

export const useOrderErrorsCount = () => useSelector(selectOrderErrorsCount);

export function useCancelOrder(order: OrderInfo) {
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const sendCancelOrdersTxn = useSendCancelOrdersTxn();
  const hasOutdatedUi = useHasOutdatedUi();

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(order.key);

  const onCancelOrder = useCallback(
    async function cancelOrder() {
      if (hasOutdatedUi) {
        helperToast.error(getPageOutdatedError());
        return;
      }

      setCancellingOrdersKeys((p) => uniq(p.concat(order.key)));

      try {
        await sendCancelOrdersTxn({ orders: [order], collateralSymbol: order.initialCollateralToken.symbol });
      } finally {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== order.key));
      }
    },
    [hasOutdatedUi, order, sendCancelOrdersTxn, setCancellingOrdersKeys]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
