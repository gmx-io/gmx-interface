import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { OrderInfo } from "sdk/types/orders";

import { selectChainId } from "../selectors/globalSelectors";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrdersWithErrorsByPositionKey,
  selectOrderErrorsByOrderKeyMap,
  selectOrderErrorsCount,
} from "../selectors/orderSelectors";
import { useSelector } from "../utils";
import { useCancellingOrdersKeysState } from "./orderEditorHooks";

export const useOrderErrors = (orderKey: string) => {
  const selector = useMemo(() => makeSelectOrderErrorByOrderKey(orderKey), [orderKey]);
  return useSelector(selector);
};

export const usePositionOrdersWithErrors = (positionKey: string | undefined) => {
  const selector = useMemo(() => makeSelectOrdersWithErrorsByPositionKey(positionKey), [positionKey]);
  return useSelector(selector);
};

export const useOrderErrorsByOrderKeyMap = () => useSelector(selectOrderErrorsByOrderKeyMap);

export const useOrderErrorsCount = () => useSelector(selectOrderErrorsCount);

export function useCancelOrder(order: OrderInfo) {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { setPendingTxns } = usePendingTxns();
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, 1);
  const subaccount = useSubaccount(null, 1);

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(order.key);

  const onCancelOrder = useCallback(
    function cancelOrder() {
      if (!signer) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(order.key)));

      cancelOrdersTxn(chainId, signer, subaccount, {
        orders: [order],
        setPendingTxns: setPendingTxns,
        detailsMsg: cancelOrdersDetailsMessage,
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== order.key));
      });
    },
    [cancelOrdersDetailsMessage, chainId, order, setCancellingOrdersKeys, setPendingTxns, signer, subaccount]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
