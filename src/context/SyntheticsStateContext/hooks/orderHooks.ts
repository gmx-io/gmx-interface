import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/useSubaccountCancelOrdersDetailsMessage";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useEthersSigner } from "lib/wallets/useEthersSigner";

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

export function useCancelOrder(orderKey: string) {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { setPendingTxns } = usePendingTxns();
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(1);
  // const subaccount = useSelector(makeSelectSubaccountForActions(1));

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(orderKey);

  const onCancelOrder = useCallback(
    function cancelOrder() {
      if (!signer) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(orderKey)));

      cancelOrdersTxn(chainId, signer, {
        orderKeys: [orderKey],
        setPendingTxns: setPendingTxns,
        detailsMsg: cancelOrdersDetailsMessage,
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== orderKey));
      });
    },
    [cancelOrdersDetailsMessage, chainId, orderKey, setCancellingOrdersKeys, setPendingTxns, signer]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
