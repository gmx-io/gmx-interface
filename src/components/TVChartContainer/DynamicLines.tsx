import { useCallback } from "react";

import { USD_DECIMALS } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import {
  useCancellingOrdersKeysState,
  useEditingOrderState,
  useOrderEditorIsSubmittingState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectChartDynamicLines } from "context/SyntheticsStateContext/selectors/chartSelectors/selectChartDynamicLines";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectMarketsInfoData,
  selectOrdersInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorSetTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useMarkets } from "domain/synthetics/markets";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { calculateDisplayDecimals, formatAmount, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { PositionOrderInfo } from "sdk/types/orders";
import { getOrderKeys } from "sdk/utils/orders";

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
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const [isSubmitting] = useOrderEditorIsSubmittingState();
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { marketsData } = useMarkets(chainId);
  const { pendingOrdersUpdates } = useSyntheticsEvents();
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const onCancelOrder = useCallback(
    async (key: string) => {
      if (!signer) return;
      const order = getByKey(ordersInfoData, key);

      if (!order) return;

      const orderKeys = getOrderKeys(order);
      setCancellingOrdersKeys((prev) => [...prev, ...orderKeys]);

      const batchParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orderKeys.map((k) => ({ orderKey: k })),
      };

      const expressParams = await estimateBatchExpressParams({
        signer,
        chainId,
        batchParams,
        globalExpressParams,
        requireValidations: true,
        estimationMethod: "approximate",
        provider: undefined,
      });

      sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams,
        noncesData: globalExpressParams?.noncesData,
        simulationParams: undefined,
        callback: makeOrderTxnCallback({}),
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [chainId, globalExpressParams, makeOrderTxnCallback, ordersInfoData, setCancellingOrdersKeys, signer]
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
