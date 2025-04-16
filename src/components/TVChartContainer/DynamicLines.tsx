import { useCallback } from "react";

import { USD_DECIMALS } from "config/factors";
import { useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/useSubaccountCancelOrdersDetailsMessage";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import {
  useCancellingOrdersKeysState,
  useEditingOrderState,
  useOrderEditorIsSubmittingState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectChartDynamicLines } from "context/SyntheticsStateContext/selectors/chartSelectors/selectChartDynamicLines";
import {
  makeSelectSubaccountForActions,
  selectChainId,
  selectMarketsInfoData,
  selectOrdersInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorSetTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { selectRelayFeeTokens } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { sendUniversalBatchTxn } from "domain/synthetics/gassless/txns/universalTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/gassless/txns/useOrderTxnCallbacks";
import { getExpressCancelOrdersParams } from "domain/synthetics/gassless/useRelayerFeeHandler";
import { useMarkets } from "domain/synthetics/markets";
import { calculateDisplayDecimals, formatAmount, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { PositionOrderInfo } from "sdk/types/orders";

import { DynamicLine } from "./DynamicLine";
import type { IChartingLibraryWidget } from "../../charting_library";

export function DynamicLines({
  tvWidgetRef,
  isMobile,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  isMobile: boolean;
}) {
  const dynamicChartLines = useSelector(selectChartDynamicLines);
  const { signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(1);
  const { makeCancelOrderTxnCallback } = useOrderTxnCallbacks();
  const [isSubmitting] = useOrderEditorIsSubmittingState();
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const { marketsData } = useMarkets(chainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const { pendingOrdersUpdates } = useSyntheticsEvents();

  const onCancelOrder = useCallback(
    async (key: string) => {
      if (!signer) return;
      setCancellingOrdersKeys((prev) => [...prev, key]);

      const expressParams = await getExpressCancelOrdersParams({
        signer,
        chainId,
        params: [{ orderKey: key }],
        subaccount,
        gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
        tokensData,
        marketsInfoData,
        findSwapPath: relayFeeTokens.findSwapPath,
      });

      sendUniversalBatchTxn({
        chainId,
        signer,
        batchParams: {
          createOrderParams: [],
          updateOrderParams: [],
          cancelOrderParams: [{ orderKey: key }],
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
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [
      cancelOrdersDetailsMessage,
      chainId,
      makeCancelOrderTxnCallback,
      marketsInfoData,
      relayFeeTokens.findSwapPath,
      relayFeeTokens.gasPaymentToken?.address,
      setCancellingOrdersKeys,
      signer,
      subaccount,
      tokensData,
    ]
  );

  const calcSelector = useCalcSelector();

  const getError = useCallback(
    (id: string, price: number): string | undefined => {
      let triggerPrice = numberToBigint(price, USD_DECIMALS);

      return calcSelector((state) => {
        const order = getByKey(selectOrdersInfoData(state), id) as PositionOrderInfo;
        const chainId = selectChainId(state);
        const marketsInfoData = selectMarketsInfoData(state);

        if (!order) return undefined;

        const indexTokenAddress = getByKey(marketsInfoData, order.marketAddress)?.indexTokenAddress;
        if (!indexTokenAddress) return undefined;

        const indexToken = getToken(chainId, indexTokenAddress);
        if (!indexToken) return undefined;

        triggerPrice = triggerPrice / BigInt(indexToken?.visualMultiplier ?? 1);

        return makeSelectOrderEditorPositionOrderError(id, triggerPrice)(state);
      });
    },
    [calcSelector]
  );

  const onEditOrder = useCallback(
    (id: string, price?: number) => {
      setEditingOrderState({ orderKey: id, source: "PriceChart" });
      const order = getByKey(ordersInfoData, id) as PositionOrderInfo;
      if (!order) return;

      const indexTokenAddress = getByKey(marketsData, order.marketAddress)?.indexTokenAddress;
      if (!indexTokenAddress) return;

      const indexToken = getToken(chainId, indexTokenAddress);
      if (!indexToken) return;

      const decimals = calculateDisplayDecimals(order.triggerPrice, USD_DECIMALS, indexToken?.visualMultiplier);
      const formattedInitialPrice = formatAmount(
        order.triggerPrice,
        USD_DECIMALS,
        decimals,
        undefined,
        undefined,
        indexToken?.visualMultiplier
      );
      setTriggerPriceInputValue(price !== undefined ? String(price) : formattedInitialPrice);
    },
    [chainId, marketsData, ordersInfoData, setEditingOrderState, setTriggerPriceInputValue]
  );

  return dynamicChartLines.map((line) => (
    <DynamicLine
      {...line}
      key={line.id}
      onEdit={onEditOrder}
      onCancel={onCancelOrder}
      getError={getError}
      tvWidgetRef={tvWidgetRef}
      isMobile={isMobile}
      isEdited={editingOrderState?.orderKey === line.id}
      isPending={(isSubmitting && editingOrderState?.orderKey === line.id) || line.id in pendingOrdersUpdates}
    />
  ));
}
