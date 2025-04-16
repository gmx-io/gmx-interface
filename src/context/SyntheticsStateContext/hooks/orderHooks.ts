import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";

import { useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/useSubaccountCancelOrdersDetailsMessage";
import { sendUniversalBatchTxn } from "domain/synthetics/gassless/txns/universalTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/gassless/txns/useOrderTxnCallbacks";
import {
  getExpressCancelOrdersParams,
  useGasPaymentTokenAllowanceData,
} from "domain/synthetics/gassless/useRelayerFeeHandler";
import { useEthersSigner } from "lib/wallets/useEthersSigner";

import {
  makeSelectSubaccountForActions,
  selectChainId,
  selectGasPrice,
  selectSponsoredCallMultiplierFactor,
  selectMarketsInfoData,
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
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(1);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const { makeCancelOrderTxnCallback } = useOrderTxnCallbacks();
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, relayFeeTokens.gasPaymentToken?.address);

  const isCancelOrderProcessing = cancellingOrdersKeys.includes(orderKey);

  const onCancelOrder = useCallback(
    async function cancelOrder() {
      if (!signer) return;

      setCancellingOrdersKeys((p) => uniq(p.concat(orderKey)));

      const expressParams = await getExpressCancelOrdersParams({
        signer,
        chainId,
        params: [{ orderKey }],
        subaccount,
        gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
        tokensData,
        marketsInfoData,
        findSwapPath: relayFeeTokens.findSwapPath,
        sponsoredCallMultiplierFactor,
        gasPrice,
        gasPaymentAllowanceData,
      });

      sendUniversalBatchTxn({
        chainId,
        signer,
        batchParams: {
          createOrderParams: [],
          updateOrderParams: [],
          cancelOrderParams: [{ orderKey }],
        },
        expressParams,
        simulationParams: undefined,
        callback: makeCancelOrderTxnCallback({
          metricId: undefined,
          slippageInputId: undefined,
          showPreliminaryMsg: Boolean(expressParams?.subaccount),
          detailsMsg: cancelOrdersDetailsMessage,
        }),
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== orderKey));
      });
    },
    [
      cancelOrdersDetailsMessage,
      chainId,
      gasPaymentAllowanceData,
      gasPrice,
      makeCancelOrderTxnCallback,
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
