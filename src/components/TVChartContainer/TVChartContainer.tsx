import { t } from "@lingui/macro";
import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLatest, useLocalStorage, useMedia } from "react-use";
import { isAddressEqual, type Address } from "viem";

import { colors } from "config/colors";
import { TV_SAVE_LOAD_CHARTS_KEY, WAS_TV_CHART_OVERRIDDEN_KEY } from "config/localStorage";
import { RESOLUTION_TO_SECONDS, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectChartDynamicLines } from "context/SyntheticsStateContext/selectors/chartSelectors/selectChartDynamicLines";
import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { OrderType, isDecreaseOrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import { parseContractPrice } from "domain/synthetics/tokens";
import { processRawTradeActions } from "domain/synthetics/tradeHistory/processTradeActions";
import { fetchRawTradeActions } from "domain/synthetics/tradeHistory/useTradeHistory";
import { TokenPrices } from "domain/tokens";
import { DataFeed } from "domain/tradingview/DataFeed";
import { getObjectKeyFromValue, getSymbolName } from "domain/tradingview/utils";
import { formatUsd, calculateDisplayDecimals } from "lib/numbers";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import useWallet from "lib/wallets/useWallet";
import { ContractsChainId } from "sdk/configs/chains";
import { isChartAvailableForToken, getTokenBySymbolSafe } from "sdk/configs/tokens";
import { convertTokenAddress } from "sdk/configs/tokens";
import { TradeActionType, isPositionTradeAction } from "sdk/utils/tradeHistory/types";

import Loader from "components/Loader/Loader";
import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

import { ChartContextMenu } from "./ChartContextMenu";
import { chartOverridesDark, chartOverridesLight, defaultChartProps, disabledFeaturesOnMobile } from "./constants";
import { CrosshairPercentageLabel } from "./CrosshairPercentageLabel";
import { DynamicLines } from "./DynamicLines";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { stackOverlappingChartLines } from "./stackOverlappingChartLines";
import { StaticLines } from "./StaticLines";
import type { StaticChartLine } from "./types";
import type { OpenChartTPSLModalParams } from "./useChartContextMenu";
import { useChartContextMenu } from "./useChartContextMenu";
import { useCrosshairPercentage } from "./useCrosshairPercentage";
import type {
  ChartData,
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  PlusClickParams,
  ResolutionString,
  Mark,
} from "../../charting_library";

/** Maximum number of trade actions to fetch per marks request */
const MARKS_PAGE_SIZE = 100;
/** How long fetched marks data stays valid in cache */
const MARKS_CACHE_TTL_MS = 60_000;

type Props = {
  chainId: number;
  chartLines: StaticChartLine[];
  period: string;
  setPeriod: (period: string) => void;
  chartToken:
    | ({
        symbol: string;
      } & TokenPrices)
    | { symbol: string };
  supportedResolutions: typeof SUPPORTED_RESOLUTIONS_V2;
  visualMultiplier?: number;
  setIsCandlesLoaded?: (isCandlesLoaded: boolean) => void;
  onOpenTPSLModal?: (params: OpenChartTPSLModalParams) => void;
};

export default function TVChartContainer({
  chartToken,
  chainId,
  chartLines,
  period,
  setPeriod,
  supportedResolutions,
  visualMultiplier,
  setIsCandlesLoaded,
  onOpenTPSLModal,
}: Props) {
  const { shouldShowPositionLines } = useSettings();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [isChartChangingSymbol, setIsChartChangingSymbol] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const [wasChartOverridden, setWasChartOverridden] = useLocalStorage<boolean>(WAS_TV_CHART_OVERRIDDEN_KEY, false);

  const { theme } = useTheme();

  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId as ContractsChainId);

  const [datafeed, setDatafeed] = useState<DataFeed | null>(null);
  const { positionIncreaseEvents, positionDecreaseEvents } = useSyntheticsEvents();
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const { chartToken: selectedChartToken } = useSelector(selectChartToken);
  const dynamicChartLines = useSelector(selectChartDynamicLines);
  const { account } = useWallet();
  const marksStateRef = useLatest({
    positionIncreaseEvents,
    positionDecreaseEvents,
    marketsInfoData,
    tokensData,
    selectedChartToken,
    visualMultiplier,
    chainId,
    account,
    shouldShowPositionLines,
  });
  const marksHistoryCacheRef = useRef<{
    key?: string;
    raw?: Awaited<ReturnType<typeof fetchRawTradeActions>>;
    fetchedAt?: number;
  }>({});

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && true) {
      const overrides = theme === "light" ? chartOverridesLight : chartOverridesDark;
      tvWidgetRef.current.applyOverrides(overrides);
      tvWidgetRef.current.saveChartToServer();
      setWasChartOverridden(true);
    }
  }, [chartReady, wasChartOverridden, setWasChartOverridden, theme]);

  useEffect(() => {
    const newDatafeed = new DataFeed(chainId, oracleKeeperFetcher);
    newDatafeed.setMarksGetter(async (_symbolInfo, from, to, resolution) => {
      const {
        positionIncreaseEvents: inc,
        positionDecreaseEvents: dec,
        marketsInfoData: markets,
        tokensData,
        selectedChartToken: selToken,
        visualMultiplier: vm,
        chainId: cid,
        account: acc,
        shouldShowPositionLines: showLines,
      } = marksStateRef.current;
      if (!showLines) {
        return [];
      }
      if (!selToken?.address) {
        return [];
      }
      const periodSeconds = RESOLUTION_TO_SECONDS[String(resolution)];
      if (!periodSeconds) {
        return [];
      }
      const wrappedSelected = convertTokenAddress(cid as ContractsChainId, selToken.address, "wrapped");
      if (!acc || !markets || !tokensData) {
        return [];
      }

      const makeMark = (p: {
        id: string;
        isIncrease: boolean;
        isLong: boolean;
        ts: number;
        marketAddress: string;
        executionPrice?: bigint;
      }): Mark | null => {
        const market = markets?.[p.marketAddress];
        if (!market) {
          return null;
        }
        const marketIndexWrapped = convertTokenAddress(cid as ContractsChainId, market.indexTokenAddress, "wrapped");
        if (!isAddressEqual(marketIndexWrapped as Address, wrappedSelected as Address)) {
          return null;
        }

        const isBuy = p.isIncrease ? p.isLong : !p.isLong;
        const label = isBuy ? "B" : "S";
        const color = isBuy ? "green" : "red";

        if (p.ts < from || p.ts > to) {
          return null;
        }
        const time = Math.floor(p.ts / periodSeconds) * periodSeconds;

        const action = p.isIncrease
          ? p.isLong
            ? t`Open Long`
            : t`Open Short`
          : p.isLong
            ? t`Close Long`
            : t`Close Short`;
        const indexToken = market.indexToken;
        const tokenVm = indexToken?.visualMultiplier ?? vm ?? 1;
        const marketPriceDecimals = indexToken?.prices?.minPrice
          ? calculateDisplayDecimals(indexToken.prices.minPrice, undefined, tokenVm)
          : undefined;
        const priceText = p.executionPrice
          ? ` · Exec. ${formatUsd(p.executionPrice, { displayDecimals: marketPriceDecimals, visualMultiplier: tokenVm })}`
          : "";

        return {
          id: p.id,
          time,
          color,
          text: `${action}${priceText}`,
          label,
          labelFontColor: "#ffffff",
          minSize: 12,
        };
      };

      const combinations = [
        {
          eventName: TradeActionType.OrderExecuted,
          isTwap: false,
          orderType: [
            OrderType.MarketIncrease,
            OrderType.LimitIncrease,
            OrderType.StopIncrease,
            OrderType.MarketDecrease,
            OrderType.LimitDecrease,
            OrderType.StopLossDecrease,
            OrderType.Liquidation,
          ],
        },
        {
          eventName: TradeActionType.OrderExecuted,
          isTwap: true,
          orderType: [OrderType.LimitIncrease, OrderType.LimitDecrease],
        },
      ];

      let raw;
      let marketAddresses: string[] = [];
      try {
        const now = Math.floor(Date.now() / 1000);
        const toClamped = Math.min(to, now);
        const toBucketed = Math.ceil(toClamped / 60) * 60;

        marketAddresses = Object.values(markets)
          .filter((m) =>
            isAddressEqual(
              convertTokenAddress(cid as ContractsChainId, m.indexTokenAddress, "wrapped") as Address,
              wrappedSelected as Address
            )
          )
          .map((m) => m.marketTokenAddress);

        const marketFilters: MarketFilterLongShortItemData[] = marketAddresses.map((addr) => ({
          marketAddress: addr as Address,
          direction: "any",
        }));

        const marketAddressesKey = marketAddresses.slice().sort().join(",");
        const cacheKey = `${cid}:${acc}:${wrappedSelected}:${resolution}:${from}:${toBucketed}:${marketAddressesKey}`;
        const cached = marksHistoryCacheRef.current;

        if (
          cached.key === cacheKey &&
          cached.raw &&
          cached.fetchedAt &&
          Date.now() - cached.fetchedAt < MARKS_CACHE_TTL_MS
        ) {
          raw = cached.raw;
        } else {
          raw = await fetchRawTradeActions({
            chainId: cid,
            pageIndex: 0,
            pageSize: MARKS_PAGE_SIZE,
            marketsDirectionsFilter: marketFilters,
            forAllAccounts: false,
            account: acc,
            fromTxTimestamp: from,
            toTxTimestamp: toBucketed,
            orderEventCombinations: combinations,
            showDebugValues: false,
          });
          marksHistoryCacheRef.current = { key: cacheKey, raw, fetchedAt: Date.now() };
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error fetching trade history marks:", err);
        raw = undefined;
      }

      const marks: Mark[] = [];
      const addedMarkIds = new Set<string>();

      const addMark = (mark: Mark | null) => {
        if (!mark) return;
        const id = String(mark.id);
        if (addedMarkIds.has(id)) return;
        addedMarkIds.add(id);
        marks.push(mark);
      };

      if (raw && markets && tokensData) {
        const processed = processRawTradeActions({
          chainId: cid,
          rawActions: raw,
          marketsInfoData: markets,
          tokensData,
          marketsDirectionsFilter: undefined,
        });

        (processed || []).forEach((pa) => {
          if (!isPositionTradeAction(pa)) return;
          const ot = pa.orderType;
          const isIncrease = isIncreaseOrderType(ot);
          const isDecrease = isDecreaseOrderType(ot) || ot === OrderType.Liquidation;
          if (!isIncrease && !isDecrease) return;
          addMark(
            makeMark({
              id: String(pa.orderKey || pa.id),
              isIncrease,
              isLong: pa.isLong,
              ts: Number(pa.timestamp),
              marketAddress: pa.marketAddress,
              executionPrice: pa.executionPrice,
            })
          );
        });
      }

      (inc || []).forEach((e) => {
        if (e.sizeDeltaUsd === 0n) return;
        if (acc && e.account && !isAddressEqual(e.account as Address, acc as Address)) return;
        const marketForEvent = markets?.[e.marketAddress];
        const tokenDecimals: number | undefined = marketForEvent?.indexToken?.decimals;
        const execPrice =
          e.executionPrice !== undefined && e.executionPrice !== null && tokenDecimals !== undefined
            ? parseContractPrice(BigInt(e.executionPrice), tokenDecimals)
            : undefined;

        addMark(
          makeMark({
            id: String(e.orderKey),
            isIncrease: true,
            isLong: e.isLong,
            ts: Number(e.increasedAtTime),
            marketAddress: e.marketAddress,
            executionPrice: execPrice,
          })
        );
      });

      (dec || []).forEach((e) => {
        if (e.sizeDeltaUsd === 0n) return;
        if (acc && e.account && !isAddressEqual(e.account as Address, acc as Address)) return;
        const marketForEvent = markets?.[e.marketAddress];
        const tokenDecimals: number | undefined = marketForEvent?.indexToken?.decimals;
        const execPrice =
          e.executionPrice !== undefined && e.executionPrice !== null && tokenDecimals !== undefined
            ? parseContractPrice(BigInt(e.executionPrice), tokenDecimals)
            : undefined;
        addMark(
          makeMark({
            id: String(e.orderKey),
            isIncrease: false,
            isLong: e.isLong,
            ts: Number(e.decreasedAtTime),
            marketAddress: e.marketAddress,
            executionPrice: execPrice,
          })
        );
      });

      marks.sort((a, b) => (a.time !== b.time ? a.time - b.time : String(a.id).localeCompare(String(b.id))));
      return marks;
    });
    if (setIsCandlesLoaded) {
      newDatafeed.addEventListener("candlesDisplay.success", (event: Event) => {
        const isFirstDraw = (event as CustomEvent).detail.isFirstTimeLoad;
        if (isFirstDraw) {
          setIsCandlesLoaded(true);
        }
      });
    }
    setDatafeed((prev) => {
      if (prev) {
        prev.destroy();
      }
      return newDatafeed;
    });
  }, [chainId, oracleKeeperFetcher, setIsCandlesLoaded, marksStateRef]);

  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(chartToken.symbol);

  const [pricePerPixel, setPricePerPixel] = useState<number>(0);
  const [plotWidthPx, setPlotWidthPx] = useState<number>(0);

  useEffect(() => {
    if (!chartReady || chartDataLoading || !tvWidgetRef.current) return;

    let chart;
    try {
      chart = tvWidgetRef.current.activeChart();
    } catch {
      return;
    }

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

      const container = chartContainerRef.current;
      const iframe = container?.querySelector("iframe");
      if (!container || !iframe?.contentDocument) return;

      const priceAxes = Array.from(iframe.contentDocument.querySelectorAll(".price-axis"));
      if (priceAxes.length === 0) return;

      let rightmostPriceAxisRect: DOMRect | null = null;
      for (const el of priceAxes) {
        const rect = el.getBoundingClientRect();
        if (rightmostPriceAxisRect === null || rect.left > rightmostPriceAxisRect.left) {
          rightmostPriceAxisRect = rect;
        }
      }

      if (!rightmostPriceAxisRect) return;

      const containerRect = container.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      const axisLeftInContainer = iframeRect.left - containerRect.left + rightmostPriceAxisRect.left;

      if (Number.isFinite(axisLeftInContainer) && axisLeftInContainer > 0) {
        setPlotWidthPx(axisLeftInContainer);
      }
    };

    update();
    chart.onVisibleRangeChanged().subscribe(null, update);
    const resizeObserver =
      chartContainerRef.current && typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (resizeObserver && chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      chart.onVisibleRangeChanged().unsubscribe(null, update);
      resizeObserver?.disconnect();
    };
  }, [chartReady, chartDataLoading]);

  const bodyFontSizePt = useMemo(() => {
    if (plotWidthPx <= 0) return 14;
    if (plotWidthPx >= 700) return 14;
    if (plotWidthPx >= 550) return 13;
    return 12;
  }, [plotWidthPx]);

  const { staticLines: stackedStaticLines, dynamicLines: stackedDynamicLines } = useMemo(
    () =>
      stackOverlappingChartLines({
        staticLines: chartLines,
        dynamicLines: dynamicChartLines,
        pricePerPixel,
        isMobile,
        plotWidthPx,
        bodyFontSizePt,
      }),
    [chartLines, dynamicChartLines, isMobile, plotWidthPx, pricePerPixel, bodyFontSizePt]
  );

  const { menuState, closeMenu, handlePlusClick, getContextMenuItems } = useChartContextMenu(
    visualMultiplier,
    chartContainerRef,
    { onOpenTPSLModal }
  );

  const crosshairPercentageState = useCrosshairPercentage(tvWidgetRef, chartContainerRef, chartReady, visualMultiplier);

  const getContextMenuItemsRef = useLatest(getContextMenuItems);
  const handlePlusClickRef = useLatest(handlePlusClick);
  const closeMenuRef = useLatest(closeMenu);

  useEffect(() => {
    if (
      !chartReady ||
      !tvWidgetRef.current ||
      !chartToken.symbol ||
      !isChartAvailableForToken(chainId, chartToken.symbol)
    ) {
      return;
    }

    const newSymbolWithMultiplier = getSymbolName(chartToken.symbol, visualMultiplier);
    const currentSymbolInfo = tvWidgetRef.current?.activeChart().symbolExt();
    const currentSymbolWithMultiplier = currentSymbolInfo
      ? getSymbolName(
          currentSymbolInfo.name,
          currentSymbolInfo.unit_id ? parseInt(currentSymbolInfo.unit_id) : undefined
        )
      : undefined;

    if (newSymbolWithMultiplier !== currentSymbolWithMultiplier) {
      setIsChartChangingSymbol(true);

      tvWidgetRef.current.setSymbol(newSymbolWithMultiplier, tvWidgetRef.current.activeChart().resolution(), () => {
        const priceScale = tvWidgetRef.current?.activeChart().getPanes().at(0)?.getMainSourcePriceScale();
        if (priceScale) {
          priceScale.setAutoScale(true);
        }
        setIsChartChangingSymbol(false);
      });
    }
  }, [chainId, chartReady, chartToken.symbol, visualMultiplier]);

  useEffect(() => {
    if (!chartReady || !tvWidgetRef.current || !chartToken.symbol) return;

    const token = getTokenBySymbolSafe(chainId, chartToken.symbol);
    const isStable = token?.isStable ?? false;

    tvWidgetRef.current.applyOverrides({
      "mainSeriesProperties.highLowAvgPrice.highLowPriceLinesVisible": false,
      "mainSeriesProperties.highLowAvgPrice.highLowPriceLabelsVisible": !isStable,
    });
  }, [chainId, chartReady, chartToken.symbol, theme]);

  const lastPeriod = useLatest(period);
  const lastSupportedResolutions = useLatest(supportedResolutions);

  useLayoutEffect(() => {
    if (symbolRef.current) {
      datafeed?.prefetchBars(
        symbolRef.current,
        getObjectKeyFromValue(lastPeriod.current, lastSupportedResolutions.current) as ResolutionString
      );
    }
  }, [datafeed, lastPeriod, lastSupportedResolutions]);

  const hasMarketsInfo = Boolean(marketsInfoData);
  const hasTokensData = Boolean(tokensData);

  const markPriceDirectionRef = useRef<"up" | "down" | "flat" | undefined>(undefined);

  useEffect(() => {
    markPriceDirectionRef.current = undefined;
  }, [theme]);

  useEffect(() => {
    if (!datafeed) return;

    const onCurrentCandleUpdate = (event: Event) => {
      if (!chartReady || !tvWidgetRef.current) return;

      const detail = (event as CustomEvent).detail as {
        resolution: ResolutionString;
        bar: { open: number; close: number };
      };

      if (tvWidgetRef.current.activeChart().resolution() !== detail.resolution) return;

      const direction =
        detail.bar.close > detail.bar.open ? "up" : detail.bar.close < detail.bar.open ? "down" : "flat";
      if (markPriceDirectionRef.current === direction) return;
      markPriceDirectionRef.current = direction;

      const neutralColor =
        theme === "light"
          ? chartOverridesLight["mainSeriesProperties.priceLineColor"]!
          : chartOverridesDark["mainSeriesProperties.priceLineColor"]!;
      const priceLineColor =
        direction === "up" ? colors.green[500][theme] : direction === "down" ? colors.red[500][theme] : neutralColor;

      tvWidgetRef.current.applyOverrides({
        "mainSeriesProperties.priceLineColor": priceLineColor,
      });
    };

    datafeed.addEventListener("currentCandle.update", onCurrentCandleUpdate);
    return () => {
      datafeed.removeEventListener("currentCandle.update", onCurrentCandleUpdate);
    };
  }, [chartReady, datafeed, theme]);

  useEffect(() => {
    if (chartReady) {
      tvWidgetRef.current?.activeChart().clearMarks();
      tvWidgetRef.current?.activeChart().refreshMarks();
    }
  }, [
    chartReady,
    positionIncreaseEvents,
    positionDecreaseEvents,
    account,
    selectedChartToken?.address,
    hasMarketsInfo,
    hasTokensData,
    visualMultiplier,
    shouldShowPositionLines,
  ]);

  useEffect(() => {
    if (!datafeed) return;

    const widgetOptions: ChartingLibraryWidgetOptions = {
      debug: false,
      symbol: symbolRef.current && getSymbolName(symbolRef.current, visualMultiplier), // Using ref to avoid unnecessary re-renders on symbol change and still have access to the latest symbol
      datafeed,
      theme: theme,
      container: chartContainerRef.current!,
      library_path: defaultChartProps.library_path,
      locale: defaultChartProps.locale,
      loading_screen:
        theme === "light"
          ? { backgroundColor: "#FFFFFF", foregroundColor: "#2962ff" }
          : defaultChartProps.loading_screen,
      enabled_features: defaultChartProps.enabled_features,
      disabled_features: isMobile
        ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
        : defaultChartProps.disabled_features,
      client_id: defaultChartProps.client_id,
      user_id: defaultChartProps.user_id,
      fullscreen: defaultChartProps.fullscreen,
      autosize: defaultChartProps.autosize,
      custom_css_url: defaultChartProps.custom_css_url,
      overrides: theme === "light" ? chartOverridesLight : chartOverridesDark,
      interval: getObjectKeyFromValue(period, supportedResolutions) as ResolutionString,
      favorites: { ...defaultChartProps.favorites, intervals: Object.keys(supportedResolutions) as ResolutionString[] },
      custom_formatters: defaultChartProps.custom_formatters,
      load_last_chart: true,
      auto_save_delay: 1,
      save_load_adapter: new SaveLoadAdapter(tvCharts, setTvCharts),
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);

    let didTriggerOnChartReady = { current: false };

    tvWidgetRef.current!.onChartReady(function () {
      didTriggerOnChartReady.current = true;
      setChartReady(true);

      const savedPeriod = tvWidgetRef.current?.activeChart().resolution();
      const preferredPeriod = getObjectKeyFromValue(period, supportedResolutions) as ResolutionString;

      if (savedPeriod && savedPeriod !== preferredPeriod) {
        tvWidgetRef.current?.activeChart().setResolution(preferredPeriod);
      }

      tvWidgetRef.current
        ?.activeChart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          if (supportedResolutions[interval]) {
            const period = supportedResolutions[interval];
            setPeriod(period);
            tvWidgetRef.current?.saveChartToServer(undefined, undefined, {
              chartName: `gmx-chart-v2`,
            });

            const priceScale = tvWidgetRef.current?.activeChart().getPanes().at(0)?.getMainSourcePriceScale();
            if (priceScale) {
              priceScale.setAutoScale(true);
            }
          }
        });

      tvWidgetRef.current?.subscribe("onAutoSaveNeeded", () => {
        tvWidgetRef.current?.saveChartToServer(undefined, undefined, {
          chartName: `gmx-chart-v2`,
        });
      });

      tvWidgetRef.current?.activeChart().dataReady(() => {
        setChartDataLoading(false);
      });

      tvWidgetRef.current?.onContextMenu((_unixTime, price) => {
        return getContextMenuItemsRef.current(price);
      });

      tvWidgetRef.current?.subscribe("onPlusClick", (params: PlusClickParams) => {
        handlePlusClickRef.current(params);
      });

      tvWidgetRef.current?.subscribe("mouse_down", () => {
        closeMenuRef.current();
      });
    });

    /*
    For some reason on prod TV sometimes does not get initialized properly,
    for these cases we wait some fixed amount of time and force TV into initialization
    */

    const forceInitTimeout = setTimeout(() => {
      if (didTriggerOnChartReady.current || !chartContainerRef.current) {
        return;
      }

      const iframe = chartContainerRef.current.querySelector("iframe");

      if (!iframe || !iframe.contentWindow) {
        return;
      }
      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframeWindow.document;

      if (iframeDocument.readyState !== "complete") {
        iframeDocument.addEventListener("readystatechange", () => {
          if (iframeDocument.readyState === "complete") {
            iframeWindow.dispatchEvent(new Event("innerWindowLoad"));
          }
        });
      } else {
        iframeWindow.dispatchEvent(new Event("innerWindowLoad"));
      }
    }, 800);

    return () => {
      clearTimeout(forceInitTimeout);
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
        setChartReady(false);
        setChartDataLoading(true);
      }
    };
    // We don't want to re-initialize the chart when the symbol changes. This will make the chart flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, datafeed, theme]);

  const style = useMemo<CSSProperties>(
    () => ({ visibility: !chartDataLoading ? "visible" : "hidden" }),
    [chartDataLoading]
  );

  return (
    <div className="ExchangeChart-error">
      {chartDataLoading && <Loader />}
      <div style={style} ref={chartContainerRef} className="ExchangeChart-bottom-content">
        {chartReady && <CrosshairPercentageLabel state={crosshairPercentageState} />}
      </div>
      {shouldShowPositionLines && chartReady && !isChartChangingSymbol && (
        <>
          <StaticLines tvWidgetRef={tvWidgetRef} chartLines={stackedStaticLines} bodyFontSizePt={bodyFontSizePt} />
          <DynamicLines
            isMobile={isMobile}
            tvWidgetRef={tvWidgetRef}
            lines={stackedDynamicLines}
            bodyFontSizePt={bodyFontSizePt}
          />
        </>
      )}
      <ChartContextMenu menuState={menuState} onClose={closeMenu} />
    </div>
  );
}
