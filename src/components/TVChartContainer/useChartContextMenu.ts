import { t } from "@lingui/macro";
import { RefObject, useCallback, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  selectTradeboxMarkPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxSetCloseSizeInputValue,
  selectTradeboxSetTradeConfig,
  selectTradeboxSetTriggerPriceInputValue,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { bigintToNumber, formatAmount, numberToBigint } from "lib/numbers";
import { formatUsdPrice } from "sdk/utils/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import type { ContextMenuItem, PlusClickParams } from "../../charting_library";

type ChartOrderAction = "limit" | "stopMarket" | "takeProfit" | "stopLoss";

export interface ChartContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const INITIAL_MENU_STATE: ChartContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  items: [],
};

function buildMenuItems(p: {
  clickPrice: number;
  markPrice: number;
  isLong: boolean;
  formattedPrice: string | undefined;
  onAction: (action: ChartOrderAction, direction: "long" | "short", price: number) => void;
}): ContextMenuItem[] {
  const direction = p.isLong ? "long" : "short";
  const isAboveMarkPrice = p.clickPrice > p.markPrice;
  const items: ContextMenuItem[] = [];

  if (p.isLong) {
    if (isAboveMarkPrice) {
      items.push({
        position: "top",
        text: t`Set Long Take Profit @ ${p.formattedPrice}`,
        click: () => p.onAction("takeProfit", direction, p.clickPrice),
      });
      items.push({
        position: "top",
        text: t`Set Long Stop Market @ ${p.formattedPrice}`,
        click: () => p.onAction("stopMarket", direction, p.clickPrice),
      });
    } else {
      items.push({
        position: "top",
        text: t`Set Long Stop Loss @ ${p.formattedPrice}`,
        click: () => p.onAction("stopLoss", direction, p.clickPrice),
      });
      items.push({
        position: "top",
        text: t`Set Long Limit @ ${p.formattedPrice}`,
        click: () => p.onAction("limit", direction, p.clickPrice),
      });
    }
  } else {
    if (isAboveMarkPrice) {
      items.push({
        position: "top",
        text: t`Set Short Stop Loss @ ${p.formattedPrice}`,
        click: () => p.onAction("stopLoss", direction, p.clickPrice),
      });
      items.push({
        position: "top",
        text: t`Set Short Limit @ ${p.formattedPrice}`,
        click: () => p.onAction("limit", direction, p.clickPrice),
      });
    } else {
      items.push({
        position: "top",
        text: t`Set Short Take Profit @ ${p.formattedPrice}`,
        click: () => p.onAction("takeProfit", direction, p.clickPrice),
      });
      items.push({
        position: "top",
        text: t`Set Short Stop Market @ ${p.formattedPrice}`,
        click: () => p.onAction("stopMarket", direction, p.clickPrice),
      });
    }
  }

  return items;
}

export function useChartContextMenu(
  visualMultiplier: number | undefined,
  chartContainerRef: RefObject<HTMLDivElement | null>
) {
  const tradeType = useSelector(selectTradeboxTradeType);
  const markPriceBn = useSelector(selectTradeboxMarkPrice);
  const position = useSelector(selectTradeboxSelectedPosition);
  const setTradeConfig = useSelector(selectTradeboxSetTradeConfig);
  const setTriggerPriceInputValue = useSelector(selectTradeboxSetTriggerPriceInputValue);
  const setCloseSizeInputValue = useSelector(selectTradeboxSetCloseSizeInputValue);

  const [menuState, setMenuState] = useState<ChartContextMenuState>(INITIAL_MENU_STATE);

  const markPrice = useMemo(() => {
    if (markPriceBn === undefined) return undefined;
    const priceFloat = bigintToNumber(markPriceBn, USD_DECIMALS);
    return visualMultiplier ? priceFloat * visualMultiplier : priceFloat;
  }, [markPriceBn, visualMultiplier]);

  const handleOrderAction = useCallback(
    (action: ChartOrderAction, direction: "long" | "short", clickPrice: number) => {
      const actualPrice = visualMultiplier ? clickPrice / visualMultiplier : clickPrice;
      const priceStr = actualPrice.toString();

      const isLong = direction === "long";
      const newTradeType = isLong ? TradeType.Long : TradeType.Short;

      switch (action) {
        case "limit":
          setTradeConfig({ tradeType: newTradeType, tradeMode: TradeMode.Limit });
          break;

        case "stopMarket":
          setTradeConfig({ tradeType: newTradeType, tradeMode: TradeMode.StopMarket });
          break;

        case "takeProfit":
        case "stopLoss":
          setTradeConfig({ tradeType: newTradeType, tradeMode: TradeMode.Trigger });
          break;
      }

      setTimeout(() => {
        setTriggerPriceInputValue(priceStr);

        if (
          (action === "takeProfit" || action === "stopLoss") &&
          position !== undefined &&
          position.isLong === isLong &&
          position.sizeInUsd !== undefined
        ) {
          setCloseSizeInputValue(formatAmount(position.sizeInUsd, USD_DECIMALS, 2));
        }
      }, 0);

      setMenuState(INITIAL_MENU_STATE);
    },
    [visualMultiplier, position, setTradeConfig, setTriggerPriceInputValue, setCloseSizeInputValue]
  );

  const closeMenu = useCallback(() => {
    setMenuState(INITIAL_MENU_STATE);
  }, []);

  const formatClickPrice = useCallback(
    (clickPrice: number) => formatUsdPrice(numberToBigint(clickPrice / (visualMultiplier || 1), USD_DECIMALS)),
    [visualMultiplier]
  );

  const handlePlusClick = useCallback(
    (params: PlusClickParams) => {
      if (menuState.isOpen) {
        setMenuState(INITIAL_MENU_STATE);
        return;
      }

      if (markPrice === undefined) {
        return;
      }

      const iframe = chartContainerRef.current?.querySelector("iframe");
      const iframeRect = iframe?.getBoundingClientRect();
      const iframeOffsetX = iframeRect?.left ?? 0;
      const iframeOffsetY = iframeRect?.top ?? 0;

      const formattedPrice = formatClickPrice(params.price);

      const items =
        tradeType === TradeType.Long || tradeType === TradeType.Short
          ? buildMenuItems({
              clickPrice: params.price,
              markPrice,
              isLong: tradeType === TradeType.Long,
              formattedPrice,
              onAction: handleOrderAction,
            })
          : tradeType === TradeType.Swap
            ? [
                ...buildMenuItems({
                  clickPrice: params.price,
                  markPrice,
                  isLong: true,
                  formattedPrice,
                  onAction: handleOrderAction,
                }),
                ...buildMenuItems({
                  clickPrice: params.price,
                  markPrice,
                  isLong: false,
                  formattedPrice,
                  onAction: handleOrderAction,
                }),
              ]
            : [];

      if (items.length === 0) {
        return;
      }

      setMenuState({
        isOpen: true,
        x: params.clientX + iframeOffsetX,
        y: params.clientY + iframeOffsetY,
        items,
      });
    },
    [markPrice, tradeType, menuState.isOpen, chartContainerRef, formatClickPrice, handleOrderAction]
  );

  const getContextMenuItems = useCallback(
    (clickPrice: number): ContextMenuItem[] => {
      if (markPrice === undefined) {
        return [];
      }

      const formattedPrice = formatClickPrice(clickPrice);

      if (tradeType === TradeType.Long || tradeType === TradeType.Short) {
        return buildMenuItems({
          clickPrice,
          markPrice,
          isLong: tradeType === TradeType.Long,
          formattedPrice,
          onAction: handleOrderAction,
        });
      }

      if (tradeType === TradeType.Swap) {
        return [
          ...buildMenuItems({
            clickPrice,
            markPrice,
            isLong: true,
            formattedPrice,
            onAction: handleOrderAction,
          }),
          ...buildMenuItems({
            clickPrice,
            markPrice,
            isLong: false,
            formattedPrice,
            onAction: handleOrderAction,
          }),
        ];
      }

      return [];
    },
    [markPrice, tradeType, formatClickPrice, handleOrderAction]
  );

  return {
    menuState,
    closeMenu,
    handlePlusClick,
    getContextMenuItems,
  };
}
