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
import { formatUsdPrice } from "sdk/utils/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import type { ContextMenuItem, PlusClickParams } from "../../charting_library";

export type ChartOrderAction = "limit" | "stopMarket" | "takeProfit" | "stopLoss";

export interface ChartContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  price: number;
  items: ChartContextMenuItem[];
}

export interface ChartContextMenuItem {
  label: string;
  action: ChartOrderAction;
  direction: "long" | "short";
}

const INITIAL_MENU_STATE: ChartContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  price: 0,
  items: [],
};

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
    const divisor = 10n ** BigInt(USD_DECIMALS);
    const priceFloat = Number(markPriceBn) / Number(divisor);
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
          const positionSizeFloat = Number(position.sizeInUsd) / Number(10n ** BigInt(USD_DECIMALS));
          setCloseSizeInputValue(positionSizeFloat.toString());
        }
      }, 0);

      setMenuState(INITIAL_MENU_STATE);
    },
    [visualMultiplier, position, setTradeConfig, setTriggerPriceInputValue, setCloseSizeInputValue]
  );

  const closeMenu = useCallback(() => {
    setMenuState(INITIAL_MENU_STATE);
  }, []);

  const handlePlusClick = useCallback(
    (params: PlusClickParams) => {
      if (menuState.isOpen) {
        setMenuState(INITIAL_MENU_STATE);
        return;
      }

      if (!markPrice || !tradeType) {
        return;
      }

      const iframe = chartContainerRef.current?.querySelector("iframe");
      const iframeRect = iframe?.getBoundingClientRect();
      const iframeOffsetX = iframeRect?.left ?? 0;
      const iframeOffsetY = iframeRect?.top ?? 0;

      const clickPrice = params.price;
      const isLong = tradeType === TradeType.Long;
      const direction = isLong ? "long" : "short";

      const formattedPrice = formatUsdPrice(
        BigInt(Math.round((clickPrice * Number(10n ** BigInt(USD_DECIMALS))) / (visualMultiplier || 1)))
      );

      const items: ChartContextMenuItem[] = [];
      const isAboveMarkPrice = clickPrice > markPrice;

      if (isAboveMarkPrice) {
        if (isLong) {
          items.push({
            label: t`Set Long Take Profit @ ${formattedPrice}`,
            action: "takeProfit",
            direction,
          });
        } else {
          items.push({
            label: t`Set Short Stop Loss @ ${formattedPrice}`,
            action: "stopLoss",
            direction,
          });
          items.push({
            label: t`Set Short Stop Market @ ${formattedPrice}`,
            action: "stopMarket",
            direction,
          });
        }
      } else {
        if (isLong) {
          items.push({
            label: t`Set Long Stop Loss @ ${formattedPrice}`,
            action: "stopLoss",
            direction,
          });
          items.push({
            label: t`Set Long Limit @ ${formattedPrice}`,
            action: "limit",
            direction,
          });
        } else {
          items.push({
            label: t`Set Short Take Profit @ ${formattedPrice}`,
            action: "takeProfit",
            direction,
          });
        }
      }

      setMenuState({
        isOpen: true,
        x: params.clientX + iframeOffsetX,
        y: params.clientY + iframeOffsetY,
        price: clickPrice,
        items,
      });
    },
    [markPrice, tradeType, visualMultiplier, menuState.isOpen, chartContainerRef]
  );

  const getContextMenuItems = useCallback(
    (clickPrice: number): ContextMenuItem[] => {
      if (!markPrice || !tradeType) {
        return [];
      }

      const isLong = tradeType === TradeType.Long;
      const direction = isLong ? "long" : "short";

      const formattedPrice = formatUsdPrice(
        BigInt(Math.round((clickPrice * Number(10n ** BigInt(USD_DECIMALS))) / (visualMultiplier || 1)))
      );

      const items: ContextMenuItem[] = [];
      const isAboveMarkPrice = clickPrice > markPrice;

      if (isAboveMarkPrice) {
        if (isLong) {
          items.push({
            position: "top",
            text: t`Set Long Take Profit @ ${formattedPrice}`,
            click: () => handleOrderAction("takeProfit", direction, clickPrice),
          });
        } else {
          items.push({
            position: "top",
            text: t`Set Short Stop Loss @ ${formattedPrice}`,
            click: () => handleOrderAction("stopLoss", direction, clickPrice),
          });
          items.push({
            position: "top",
            text: t`Set Short Stop Market @ ${formattedPrice}`,
            click: () => handleOrderAction("stopMarket", direction, clickPrice),
          });
        }
      } else {
        if (isLong) {
          items.push({
            position: "top",
            text: t`Set Long Stop Loss @ ${formattedPrice}`,
            click: () => handleOrderAction("stopLoss", direction, clickPrice),
          });
          items.push({
            position: "top",
            text: t`Set Long Limit @ ${formattedPrice}`,
            click: () => handleOrderAction("limit", direction, clickPrice),
          });
        } else {
          items.push({
            position: "top",
            text: t`Set Short Take Profit @ ${formattedPrice}`,
            click: () => handleOrderAction("takeProfit", direction, clickPrice),
          });
        }
      }

      return items;
    },
    [markPrice, tradeType, visualMultiplier, handleOrderAction]
  );

  return {
    menuState,
    closeMenu,
    handlePlusClick,
    handleOrderAction,
    getContextMenuItems,
  };
}
