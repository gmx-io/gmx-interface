import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { estimateExpressParams } from "domain/synthetics/orders/expressOrderUtils";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { useJsonRpcProvider } from "lib/rpc";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { OrderInfo } from "sdk/types/orders";
import { getOrderKeys } from "sdk/utils/orders";

import { selectExpressGlobalParams } from "../selectors/expressSelectors";
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
  const { provider } = useJsonRpcProvider(chainId);
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(order.key);

  const onCancelOrder = useCallback(
    async function cancelOrder() {
      if (!signer) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(order.key)));

      const orderKeys = getOrderKeys(order);

      const batchParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orderKeys.map((k) => ({ orderKey: k })),
      };

      const expressParams = globalExpressParams
        ? await estimateExpressParams({
            signer,
            chainId,
            batchParams,
            globalExpressParams,
            requireGasPaymentTokenApproval: true,
            estimationMethod: "approximate",
            provider,
          })
        : undefined;

      sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({}),
        provider,
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== order.key));
      });
    },
    [chainId, globalExpressParams, makeOrderTxnCallback, order, provider, setCancellingOrdersKeys, signer]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
