import { t } from "@lingui/macro";
import { RefObject, useCallback, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { getNetworkFeatures } from "config/features";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxMarkPrice,
  selectTradeboxSelectedPosition,
  selectTradeboxSetTradeConfig,
  selectTradeboxToToken,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { bigintToNumber, formatAmountFree, numberToBigint, parseValue } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { formatUsdPrice } from "sdk/utils/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import type { ContextMenuItem, PlusClickParams } from "../../charting_library";

type ChartOrderAction = "limit" | "stopMarket" | "takeProfit" | "stopLoss";
type ChartDirection = "long" | "short";

export type OpenChartTPSLModalParams = {
  positionKey: string;
  triggerPrice: string;
  action: Extract<ChartOrderAction, "takeProfit" | "stopLoss">;
};

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

export function getChartOrderPriceInputValue(
  clickPrice: number,
  chartVisualMultiplier: number | undefined,
  inputVisualMultiplier: number | undefined
): string {
  const chartPrice = parseValue(
    clickPrice.toLocaleString("en-US", { useGrouping: false, maximumSignificantDigits: 17 }),
    USD_DECIMALS
  );

  if (chartPrice === undefined) {
    return "";
  }

  const chartMultiplier = BigInt(chartVisualMultiplier || 1);
  const inputMultiplier = BigInt(inputVisualMultiplier || 1);
  const inputPrice = bigMath.mulDiv(chartPrice, inputMultiplier, chartMultiplier);

  return formatAmountFree(inputPrice, USD_DECIMALS);
}

function buildMenuItems(p: {
  clickPrice: number;
  markPrice: number;
  isLong: boolean;
  showTpSlActions: boolean;
  showStopMarket: boolean;
  onAction: (action: ChartOrderAction, direction: ChartDirection, price: number) => void;
}): ContextMenuItem[] {
  const formattedPrice = formatUsdPrice(numberToBigint(p.clickPrice, USD_DECIMALS));
  const direction = p.isLong ? "long" : "short";
  const isAboveMarkPrice = p.clickPrice > p.markPrice;
  const items: ContextMenuItem[] = [];

  if (p.isLong) {
    if (isAboveMarkPrice) {
      if (p.showTpSlActions) {
        items.push({
          position: "top",
          text: t`Set long Take-Profit @ ${formattedPrice}`,
          click: () => p.onAction("takeProfit", direction, p.clickPrice),
        });
      }
      if (p.showStopMarket) {
        items.push({
          position: "top",
          text: t`Set long Stop Market @ ${formattedPrice}`,
          click: () => p.onAction("stopMarket", direction, p.clickPrice),
        });
      }
    } else {
      if (p.showTpSlActions) {
        items.push({
          position: "top",
          text: t`Set long Stop-Loss @ ${formattedPrice}`,
          click: () => p.onAction("stopLoss", direction, p.clickPrice),
        });
      }
      items.push({
        position: "top",
        text: t`Set long Limit @ ${formattedPrice}`,
        click: () => p.onAction("limit", direction, p.clickPrice),
      });
    }
  } else {
    if (isAboveMarkPrice) {
      if (p.showTpSlActions) {
        items.push({
          position: "top",
          text: t`Set short Stop-Loss @ ${formattedPrice}`,
          click: () => p.onAction("stopLoss", direction, p.clickPrice),
        });
      }
      items.push({
        position: "top",
        text: t`Set short Limit @ ${formattedPrice}`,
        click: () => p.onAction("limit", direction, p.clickPrice),
      });
    } else {
      if (p.showTpSlActions) {
        items.push({
          position: "top",
          text: t`Set short Take-Profit @ ${formattedPrice}`,
          click: () => p.onAction("takeProfit", direction, p.clickPrice),
        });
      }
      if (p.showStopMarket) {
        items.push({
          position: "top",
          text: t`Set short Stop Market @ ${formattedPrice}`,
          click: () => p.onAction("stopMarket", direction, p.clickPrice),
        });
      }
    }
  }

  return items;
}

export function useChartContextMenu(
  visualMultiplier: number | undefined,
  chartContainerRef: RefObject<HTMLDivElement | null>,
  hasSizableLines: boolean,
  options?: {
    onOpenTPSLModal?: (params: OpenChartTPSLModalParams) => void;
  }
) {
  const onOpenTPSLModal = options?.onOpenTPSLModal;
  const tradeType = useSelector(selectTradeboxTradeType);
  const chartToken = useSelector(selectTradeboxToToken);
  const marketIndexAddress = chartToken?.isNative ? chartToken.wrappedAddress : chartToken?.address;
  const availableTokens = useSelector(selectTradeboxAvailableTokensOptions);
  const swapTargetMarket =
    tradeType === TradeType.Swap
      ? availableTokens.sortedAllMarkets.find((market) => market.indexTokenAddress === marketIndexAddress)
      : undefined;
  const orderTokenAddress = swapTargetMarket?.indexToken.address ?? chartToken?.address;
  const canPlaceOrderFromSwap = Boolean(swapTargetMarket);
  const orderInputMultiplier = swapTargetMarket?.indexToken?.visualMultiplier ?? chartToken?.visualMultiplier;
  const markPriceBn = useSelector(selectTradeboxMarkPrice);
  const position = useSelector(selectTradeboxSelectedPosition);
  const setTradeConfig = useSelector(selectTradeboxSetTradeConfig);
  const setChartTriggerPrice = useSelector((s) => s.tradebox.setChartTriggerPrice);
  const { chartLinesSizeInTokens, setChartLinesSizeInTokens } = useSettings();
  const { networkId } = useChainId();
  const showStopMarket = getNetworkFeatures(networkId).stopMarket;
  const calcSelector = useCalcSelector();

  const [menuState, setMenuState] = useState<ChartContextMenuState>(INITIAL_MENU_STATE);

  const markPrice = useMemo(() => {
    if (markPriceBn === undefined) return undefined;
    const priceFloat = bigintToNumber(markPriceBn, USD_DECIMALS);
    return visualMultiplier ? priceFloat * visualMultiplier : priceFloat;
  }, [markPriceBn, visualMultiplier]);

  const handleOrderAction = useCallback(
    (action: ChartOrderAction, direction: ChartDirection, clickPrice: number) => {
      const isLong = direction === "long";
      const newTradeType = isLong ? TradeType.Long : TradeType.Short;

      setMenuState(INITIAL_MENU_STATE);

      if (action === "takeProfit" || action === "stopLoss") {
        if (!position || position.isLong !== isLong) return;

        onOpenTPSLModal?.({
          positionKey: position.key,
          triggerPrice: getChartOrderPriceInputValue(
            clickPrice,
            visualMultiplier,
            position.indexToken?.visualMultiplier
          ),
          action,
        });
        return;
      }

      if (!orderTokenAddress) return;
      if (tradeType === TradeType.Swap) {
        const chooseMarket = calcSelector(selectTradeboxChooseSuitableMarket);
        if (!chooseMarket(orderTokenAddress, newTradeType, newTradeType)) return;
      }
      const tradeMode = action === "limit" ? TradeMode.Limit : TradeMode.StopMarket;
      setTradeConfig({ tradeType: newTradeType, tradeMode });
      setChartTriggerPrice({
        networkId,
        toTokenAddress: orderTokenAddress,
        tradeType: newTradeType,
        tradeMode,
        value: getChartOrderPriceInputValue(clickPrice, visualMultiplier, orderInputMultiplier),
      });
    },
    [
      visualMultiplier,
      position,
      setTradeConfig,
      setChartTriggerPrice,
      networkId,
      orderInputMultiplier,
      onOpenTPSLModal,
      calcSelector,
      orderTokenAddress,
      tradeType,
    ]
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

      if (markPrice === undefined) {
        return;
      }

      const iframe = chartContainerRef.current?.querySelector("iframe");
      const iframeRect = iframe?.getBoundingClientRect();
      const iframeOffsetX = iframeRect?.left ?? 0;
      const iframeOffsetY = iframeRect?.top ?? 0;

      const items =
        tradeType === TradeType.Long || tradeType === TradeType.Short
          ? buildMenuItems({
              clickPrice: params.price,
              markPrice,
              isLong: tradeType === TradeType.Long,
              showTpSlActions:
                position !== undefined &&
                position.isLong === (tradeType === TradeType.Long) &&
                (position.sizeInUsd ?? 0n) > 0n,
              showStopMarket,
              onAction: handleOrderAction,
            })
          : canPlaceOrderFromSwap
            ? [
                ...buildMenuItems({
                  clickPrice: params.price,
                  markPrice,
                  isLong: true,
                  showTpSlActions: false,
                  showStopMarket,
                  onAction: handleOrderAction,
                }),
                ...buildMenuItems({
                  clickPrice: params.price,
                  markPrice,
                  isLong: false,
                  showTpSlActions: false,
                  showStopMarket,
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
    [
      markPrice,
      tradeType,
      canPlaceOrderFromSwap,
      menuState.isOpen,
      chartContainerRef,
      handleOrderAction,
      position,
      showStopMarket,
    ]
  );

  const getContextMenuItems = useCallback(
    (clickPrice: number): ContextMenuItem[] => {
      if (markPrice === undefined) {
        return [];
      }

      let orderItems: ContextMenuItem[] = [];

      if (tradeType === TradeType.Long || tradeType === TradeType.Short) {
        orderItems = buildMenuItems({
          clickPrice,
          markPrice,
          isLong: tradeType === TradeType.Long,
          showTpSlActions:
            position !== undefined &&
            position.isLong === (tradeType === TradeType.Long) &&
            (position.sizeInUsd ?? 0n) > 0n,
          showStopMarket,
          onAction: handleOrderAction,
        });
      } else if (canPlaceOrderFromSwap) {
        orderItems = [
          ...buildMenuItems({
            clickPrice,
            markPrice,
            isLong: true,
            showTpSlActions: false,
            showStopMarket,
            onAction: handleOrderAction,
          }),
          ...buildMenuItems({
            clickPrice,
            markPrice,
            isLong: false,
            showTpSlActions: false,
            showStopMarket,
            onAction: handleOrderAction,
          }),
        ];
      }

      if (!hasSizableLines) {
        return orderItems;
      }

      const sizeDenominationItem: ContextMenuItem = {
        position: "top",
        text: chartLinesSizeInTokens ? t`Show line values in USD` : t`Show line values in tokens`,
        click: () => setChartLinesSizeInTokens(!chartLinesSizeInTokens),
      };

      if (orderItems.length === 0) {
        return [sizeDenominationItem];
      }

      const separator: ContextMenuItem = { position: "top", text: "-", click: () => undefined };

      return [...orderItems, separator, sizeDenominationItem];
    },
    [
      markPrice,
      tradeType,
      canPlaceOrderFromSwap,
      handleOrderAction,
      position,
      showStopMarket,
      hasSizableLines,
      chartLinesSizeInTokens,
      setChartLinesSizeInTokens,
    ]
  );

  return {
    menuState,
    closeMenu,
    handlePlusClick,
    getContextMenuItems,
  };
}
