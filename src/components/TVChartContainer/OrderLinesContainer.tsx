import { useCallback } from "react";
import type { IChartingLibraryWidget } from "../../charting_library";

import { USD_DECIMALS } from "config/factors";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import {
  useCancellingOrdersKeysState,
  useEditingOrderKeyState,
  useOrderEditorIsSubmittingState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectChartDynamicLines } from "context/SyntheticsStateContext/selectors/chartSelectors/selectChartDynamicLines";
import {
  selectChainId,
  selectMarketsInfoData,
  selectOrdersInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorSetTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarkets } from "domain/synthetics/markets";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { calculateDisplayDecimals, formatAmount, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { PositionOrderInfo } from "sdk/types/orders";

import { DynamicLineComponent } from "./DynamicLineComponent";

export function OrderLinesContainer({
  tvWidgetRef,
  chartReady,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  chartReady: boolean;
}) {
  const dynamicChartLines = useSelector(selectChartDynamicLines);
  const { signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const subaccount = useSubaccount(null);
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, 1);
  const [isSubmitting] = useOrderEditorIsSubmittingState();
  const [editingOrderKey, setEditingOrderKey] = useEditingOrderKeyState();
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { marketsData } = useMarkets(chainId);
  const { setPendingTxns } = usePendingTxns();
  const { pendingOrdersUpdates } = useSyntheticsEvents();

  const onCancelOrder = useCallback(
    (key: string) => {
      if (!signer) return;
      setCancellingOrdersKeys((prev) => [...prev, key]);

      cancelOrdersTxn(chainId, signer, subaccount, {
        orderKeys: [key],
        setPendingTxns: setPendingTxns,
        detailsMsg: cancelOrdersDetailsMessage,
      }).finally(() => {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [cancelOrdersDetailsMessage, chainId, setCancellingOrdersKeys, setPendingTxns, signer, subaccount]
  );

  const calcSelector = useCalcSelector();

  const getError = useCallback(
    (id: string, price: number): string | undefined => {
      let triggerPrice = numberToBigint(price, USD_DECIMALS);

      return calcSelector((state) => {
        const order = getByKey(selectOrdersInfoData(state), id) as PositionOrderInfo;
        const chainId = selectChainId(state);
        const marketsData = selectMarketsInfoData(state);

        if (!order) return undefined;

        const indexTokenAddress = getByKey(marketsData, order.marketAddress)?.indexTokenAddress;
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
      setEditingOrderKey(id);
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
    [chainId, marketsData, ordersInfoData, setEditingOrderKey, setTriggerPriceInputValue]
  );

  if (!chartReady) return null;

  return dynamicChartLines.map((line) => (
    <DynamicLineComponent
      {...line}
      key={line.id}
      onEdit={onEditOrder}
      onCancel={onCancelOrder}
      getError={getError}
      tvWidgetRef={tvWidgetRef}
      isEdited={editingOrderKey === line.id}
      isPending={(isSubmitting && editingOrderKey === line.id) || line.id in pendingOrdersUpdates}
    />
  ));
}
