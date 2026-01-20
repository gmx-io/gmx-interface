import { t } from "@lingui/macro";
import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { helperToast } from "lib/helperToast";
import { useJsonRpcProvider } from "lib/rpc";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { OrderInfo } from "sdk/utils/orders/types";
import { getOrderKeys } from "sdk/utils/orders";

import { selectExpressGlobalParams } from "../selectors/expressSelectors";
import { selectChainId, selectSrcChainId, selectSubaccountForChainAction } from "../selectors/globalSelectors";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrdersWithErrorsByPositionKey,
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

export const useOrderErrorsCount = () => useSelector(selectOrderErrorsCount);

export function useCancelOrder(order: OrderInfo) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);
  const hasOutdatedUi = useHasOutdatedUi();

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(order.key);

  const onCancelOrder = useCallback(
    async function cancelOrder() {
      if (hasOutdatedUi) {
        helperToast.error(t`Page outdated, please refresh`);
        return;
      }
      if (!signer || !provider) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(order.key)));

      const orderKeys = getOrderKeys(order);

      const batchParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orderKeys.map((k) => ({ orderKey: k })),
      };

      const expressParams = globalExpressParams
        ? await estimateBatchExpressParams({
            signer,
            chainId,
            batchParams,
            globalExpressParams,
            requireValidations: true,
            estimationMethod: "approximate",
            provider,
            isGmxAccount: srcChainId !== undefined,
            subaccount,
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
        isGmxAccount: srcChainId !== undefined,
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== order.key));
      });
    },
    [
      chainId,
      globalExpressParams,
      hasOutdatedUi,
      makeOrderTxnCallback,
      order,
      provider,
      setCancellingOrdersKeys,
      signer,
      srcChainId,
      subaccount,
    ]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
