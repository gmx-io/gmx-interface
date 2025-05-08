import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { getApproximateEstimatedExpressParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { OrderInfo } from "sdk/types/orders";
import { getOrderKeys } from "sdk/utils/orders";

import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectChainId,
  selectGasLimits,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsSponsoredCallAvailable,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectTokensData,
} from "../selectors/globalSelectors";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrdersWithErrorsByPositionKey,
  selectOrderErrorsByOrderKeyMap,
  selectOrderErrorsCount,
} from "../selectors/orderSelectors";
import { selectExecutionFeeBufferBps } from "../selectors/settingsSelectors";
import { selectRelayFeeTokens } from "../selectors/tradeSelectors";
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
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const gasPrice = useSelector(selectGasPrice);
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const gasPaymentAllowance = useSelector(selectGasPaymentTokenAllowance);
  const gasLimits = useSelector(selectGasLimits);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);
  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);
  const isExpressEnabled = useSelector(makeSelectIsExpressTransactionAvailable(false));
  const isSponsoredCallAvailable = useSelector(selectIsSponsoredCallAvailable);

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

      let approximateExpressParams = isExpressEnabled
        ? await getApproximateEstimatedExpressParams({
            signer,
            chainId,
            batchParams,
            subaccount,
            gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
            tokensData,
            marketsInfoData,
            tokenPermits: [],
            findSwapPath: relayFeeTokens.findSwapPath,
            gasPrice,
            gasPaymentAllowanceData: gasPaymentAllowance?.tokensAllowanceData,
            gasLimits,
            l1Reference,
            bufferBps: executionFeeBufferBps,
            isSponsoredCall: isSponsoredCallAvailable,
          })
        : undefined;

      // There is no UI to request an approval
      if (approximateExpressParams?.expressParams?.relayFeeParams.needGasPaymentTokenApproval) {
        approximateExpressParams = undefined;
      }

      sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams: approximateExpressParams?.expressParams,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({}),
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== order.key));
      });
    },
    [
      chainId,
      executionFeeBufferBps,
      gasLimits,
      gasPaymentAllowance?.tokensAllowanceData,
      gasPrice,
      isExpressEnabled,
      isSponsoredCallAvailable,
      l1Reference,
      makeOrderTxnCallback,
      marketsInfoData,
      order,
      relayFeeTokens.findSwapPath,
      relayFeeTokens.gasPaymentToken?.address,
      setCancellingOrdersKeys,
      signer,
      subaccount,
      tokensData,
    ]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
