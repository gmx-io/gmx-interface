import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  selectSrcChainId,
  selectSubaccountForChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorSetTriggerPriceInputValue,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useMarkets } from "domain/synthetics/markets";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { helperToast } from "lib/helperToast";
import { calculateDisplayDecimals, formatAmount, numberToBigint } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { getOrderKeys } from "sdk/utils/orders";
import { PositionOrderInfo } from "sdk/utils/orders/types";

import { DynamicLine } from "./DynamicLine";
import type { IChartingLibraryWidget } from "../../charting_library";

const BASE_ORDER_LINE_LENGTH = -40;
/**
 * Horizontal offset in pixels between stacked order lines at the same price level.
 * Chosen to accommodate the full width of an order line label (~180px) plus padding.
 */
const ORDER_SPACING_PX = 190;
/**
 * Approximate height of an order line label in pixels.
 * If two orders are closer than this on the Y axis, their labels will visually overlap.
 */
const OVERLAP_THRESHOLD_PX = 30;

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
  const srcChainId = useSelector(selectSrcChainId);
  const { provider } = useJsonRpcProvider(chainId);
  const [, setCancellingOrdersKeys] = useCancellingOrdersKeysState();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const [isSubmitting] = useOrderEditorIsSubmittingState();
  const [editingOrderState, setEditingOrderState] = useEditingOrderState();
  const setTriggerPriceInputValue = useSelector(selectOrderEditorSetTriggerPriceInputValue);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { marketsData } = useMarkets(chainId);
  const { pendingOrdersUpdates } = useSyntheticsEvents();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);
  const hasOutdatedUi = useHasOutdatedUi();

  const onCancelOrder = useCallback(
    async (key: string) => {
      if (!signer || !provider) return;

      if (hasOutdatedUi) {
        helperToast.error(t`Page outdated, please refresh`);
        return;
      }

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
        provider,
        isGmxAccount: srcChainId !== undefined,
        subaccount,
      });

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
        setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [
      chainId,
      globalExpressParams,
      hasOutdatedUi,
      makeOrderTxnCallback,
      ordersInfoData,
      provider,
      setCancellingOrdersKeys,
      signer,
      srcChainId,
      subaccount,
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

  const [pricePerPixel, setPricePerPixel] = useState<number>(0);

  useEffect(() => {
    const chart = tvWidgetRef.current?.activeChart();
    if (!chart) return;

    const update = () => {
      const pane = chart.getPanes()?.[0];
      if (!pane) return;

      const priceScale = pane.getMainSourcePriceScale();
      if (!priceScale) return;

      const range = priceScale.getVisiblePriceRange();
      if (!range) return;

      const height = pane.getHeight();
      if (height <= 0) return;

      setPricePerPixel((range.to - range.from) / height);
    };

    update();
    chart.onVisibleRangeChanged().subscribe(null, update);

    return () => {
      chart.onVisibleRangeChanged().unsubscribe(null, update);
    };
  }, [tvWidgetRef]);

  const linesWithStackedOffsets = useMemo(() => {
    if (dynamicChartLines.length === 0) {
      return [];
    }

    const sortedLines = [...dynamicChartLines].sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price;
      }
      return Number(b.updatedAtTime - a.updatedAtTime);
    });

    const proximityThreshold = pricePerPixel > 0 ? OVERLAP_THRESHOLD_PX * pricePerPixel : 0;

    let groupIndex = 0;

    return sortedLines.map((line, i) => {
      if (i === 0) {
        groupIndex = 0;
      } else {
        const prevPrice = sortedLines[i - 1].price;
        const priceDiff = Math.abs(line.price - prevPrice);

        if (priceDiff === 0 || (proximityThreshold > 0 && priceDiff < proximityThreshold)) {
          groupIndex++;
        } else {
          groupIndex = 0;
        }
      }

      return {
        ...line,
        lineLength: BASE_ORDER_LINE_LENGTH - groupIndex * ORDER_SPACING_PX,
      };
    });
  }, [dynamicChartLines, pricePerPixel]);

  return linesWithStackedOffsets.map(({ updatedAtTime: _, ...line }) => (
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
