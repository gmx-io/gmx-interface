import { useCallback } from "react";

import { USD_DECIMALS } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import {
  useCancellingOrdersKeysState,
  useEditingOrderState,
  useOrderEditorIsSubmittingState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectOrdersInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorSetTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { useSendCancelOrdersTxn } from "domain/synthetics/orders/useSendCancelOrdersTxn";
import { helperToast } from "lib/helperToast";
import { calculateDisplayDecimals, formatAmount, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { getOrderKeys } from "sdk/utils/orders";
import { PositionOrderInfo } from "sdk/utils/orders/types";

import { DynamicLine } from "./DynamicLine";
import type { DynamicChartLine } from "./types";
import type { IChartingLibraryWidget } from "../../charting_library";

export function DynamicLines({
  tvWidgetRef,
  isMobile,
  lines,
  bodyFontSizePt,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  isMobile: boolean;
  lines: Array<DynamicChartLine & { lineLength: number }>;
  bodyFontSizePt: number;
}) {
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const sendCancelOrdersTxn = useSendCancelOrdersTxn();
  const [isSubmitting] = useOrderEditorIsSubmittingState();
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { pendingOrdersUpdates } = useSyntheticsEvents();
  const hasOutdatedUi = useHasOutdatedUi();

  const onCancelOrder = useCallback(
    async (key: string) => {
      if (hasOutdatedUi) {
        helperToast.error(getPageOutdatedError());
        return;
      }

      const order = getByKey(ordersInfoData, key);

      if (!order) return;

      const orderKeys = getOrderKeys(order);
      setCancellingOrdersKeys((prev) => [...prev, ...orderKeys]);

      try {
        await sendCancelOrdersTxn({ orders: [order], collateralSymbol: order.initialCollateralToken.symbol });
      } finally {
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      }
    },
    [hasOutdatedUi, ordersInfoData, sendCancelOrdersTxn, setCancellingOrdersKeys]
  );

  const calcSelector = useCalcSelector();

  const getError = useCallback(
    (id: string, price: number): string | undefined => {
      let triggerPrice = numberToBigint(price, USD_DECIMALS);

      return calcSelector((state) => {
        const order = getByKey(selectOrdersInfoData(state), id) as PositionOrderInfo;

        if (!order?.indexToken) return undefined;

        triggerPrice = triggerPrice / BigInt(order.indexToken.visualMultiplier ?? 1);

        return makeSelectOrderEditorPositionOrderError(id, triggerPrice)(state);
      });
    },
    [calcSelector]
  );

  const onEditOrder = useCallback(
    (id: string, price?: number) => {
      setEditingOrderState({ orderKey: id, source: "PriceChart" });
      const order = getByKey(ordersInfoData, id) as PositionOrderInfo;
      if (!order?.indexToken) return;

      const indexToken = order.indexToken;

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
    [ordersInfoData, setEditingOrderState, setTriggerPriceInputValue]
  );

  return lines.map(({ updatedAtTime: _, ...line }) => (
    <DynamicLine
      {...line}
      key={line.id}
      onEdit={onEditOrder}
      onCancel={onCancelOrder}
      getError={getError}
      tvWidgetRef={tvWidgetRef}
      isMobile={isMobile}
      bodyFontSizePt={bodyFontSizePt}
      isEdited={editingOrderState?.orderKey === line.id}
      isPending={(isSubmitting && editingOrderState?.orderKey === line.id) || line.id in pendingOrdersUpdates}
    />
  ));
}
