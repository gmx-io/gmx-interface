import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import {
  getApproximateEstimatedExpressParams,
  useGasPaymentTokenAllowanceData,
} from "domain/synthetics/express/useRelayerFeeHandler";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { useEthersSigner } from "lib/wallets/useEthersSigner";

import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectSponsoredCallMultiplierFactor,
  selectTokensData,
} from "../selectors/globalSelectors";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrdersWithErrorsByPositionKey,
  selectOrderErrorsByOrderKeyMap,
  selectOrderErrorsCount,
} from "../selectors/orderSelectors";
import { selectRelayFeeTokens } from "../selectors/tradeSelectors";
import { useSelector } from "../utils";
import { selectExecutionFeeBufferBps } from "../selectors/settingsSelectors";
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
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, relayFeeTokens.gasPaymentToken?.address);
  const gasLimits = useSelector(selectGasLimits);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);
  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);
  const isExpressEnabled = useSelector(makeSelectIsExpressTransactionAvailable(false));

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(orderKey);

  const onCancelOrder = useCallback(
    async function cancelOrder() {
      if (!signer) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(orderKey)));

      const fastExpressParams = isExpressEnabled
        ? await getApproximateEstimatedExpressParams({
            signer,
            chainId,
            batchParams: {
              createOrderParams: [],
              updateOrderParams: [],
              cancelOrderParams: [{ orderKey }],
            },
            subaccount,
            gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
            tokensData,
            marketsInfoData,
            tokenPermits: [],
            findSwapPath: relayFeeTokens.findSwapPath,
            sponsoredCallMultiplierFactor,
            gasPrice,
            gasPaymentAllowanceData,
            gasLimits,
            l1Reference,
            bufferBps: executionFeeBufferBps,
          })
        : undefined;

      sendBatchOrderTxn({
        chainId,
        signer,
        batchParams: {
          createOrderParams: [],
          updateOrderParams: [],
          cancelOrderParams: [{ orderKey }],
        },
        expressParams: fastExpressParams?.expressParams,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({}),
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== orderKey));
      });
    },
    [
      chainId,
      executionFeeBufferBps,
      gasLimits,
      gasPaymentAllowanceData,
      gasPrice,
      l1Reference,
      makeOrderTxnCallback,
      marketsInfoData,
      orderKey,
      relayFeeTokens.findSwapPath,
      relayFeeTokens.gasPaymentToken?.address,
      setCancellingOrdersKeys,
      signer,
      sponsoredCallMultiplierFactor,
      subaccount,
      tokensData,
    ]
  );

  return [isCancelOrderProcessing, onCancelOrder] as const;
}
