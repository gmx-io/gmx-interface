import { useCallback } from "react";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useEstimateOrdersActionExpressParams } from "domain/synthetics/express/useOrdersActionExpressParams";
import {
  getExpressParamsForSubmit,
  reportMultichainExpressSubmitError,
} from "domain/synthetics/express/validateMultichainExpressSubmit";
import { useJsonRpcProvider } from "lib/rpc";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import type { OrderInfo } from "sdk/utils/orders/types";
import { type BatchOrderTxnParams, getCancelOrderParams } from "sdk/utils/orderTransactions";

import { sendBatchOrderTxn } from "./sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "./useOrderTxnCallbacks";

export function useSendCancelOrdersTxn() {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const { provider } = useJsonRpcProvider(chainId);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const estimateOrdersActionExpressParams = useEstimateOrdersActionExpressParams();

  return useCallback(
    async ({ orders, collateralSymbol }: { orders: OrderInfo[]; collateralSymbol: string | undefined }) => {
      if (!signer || !provider) {
        return undefined;
      }

      const batchParams: BatchOrderTxnParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orders.flatMap(getCancelOrderParams),
      };

      const { isGmxAccount, expressParams, unavailableGasPaymentToken } = await estimateOrdersActionExpressParams({
        signer,
        provider,
        batchParams,
        orders,
      });

      if (
        reportMultichainExpressSubmitError({
          isGmxAccount,
          expressParams,
          tokensData: undefined,
          unavailableGasPaymentToken,
          actionName: "Cancel Order",
          collateral: collateralSymbol,
        })
      ) {
        return undefined;
      }

      return sendBatchOrderTxn({
        chainId,
        signer,
        provider,
        batchParams,
        expressParams: getExpressParamsForSubmit(expressParams),
        simulationParams: undefined,
        callback: makeOrderTxnCallback({ actionName: "Cancel Order", collateralSymbol }),
        isGmxAccount,
      });
    },
    [chainId, estimateOrdersActionExpressParams, makeOrderTxnCallback, provider, signer]
  );
}
