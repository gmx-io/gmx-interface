import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { TV_CHART_RELOAD_TIMESTAMP_KEY, TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { useLocalStorage, useMedia } from "react-use";
import { defaultChartProps, DEFAULT_PERIOD, disabledFeaturesOnMobile } from "./constants";
import useTVDatafeed, { TvDatafeed } from "domain/tradingview/useTVDatafeed";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { getObjectKeyFromValue, getSymbolName } from "domain/tradingview/utils";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { SUPPORTED_RESOLUTIONS, TV_CHART_RELOAD_INTERVAL } from "config/tradingview";
import { isChartAvailabeForToken } from "config/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";

import { useLocalStorageSerializeKey } from "lib/localStorage";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { ThemeContext } from "store/theme-provider";
import { getMidPrice, Token, TokenPrices } from "domain/tokens";
import { bigintToNumber } from "lib/numbers";
import Loader from "components/Common/Loader";

type ChartLine = {
  price: number;
  title: string;
};

type Props = {
  symbol?: string;
  chainId: number;
  savedShouldShowPositionLines? : Boolean;
  chartLines: ChartLine[];
  onSelectToken: (token: Token) => void;
  period: string;
  setPeriod: (period: string) => void;
  dataProvider?: TVDataProvider;
  datafeed: TvDatafeed;
  chartToken:
    | ({
        symbol: string;
      } & TokenPrices)
    | { symbol: string };
  supportedResolutions: typeof SUPPORTED_RESOLUTIONS;
  oraclePriceDecimals?: number;
  visualMultiplier?: number;
};

export default function TVChartContainer({
  symbol,
  chainId,
  savedShouldShowPositionLines,
  chartLines,
  onSelectToken,
  dataProvider,
  datafeed,
  period,
  setPeriod,
  chartToken,
  supportedResolutions,
  oraclePriceDecimals,
  visualMultiplier,
}: Props) {
  //let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);

  // if (!period || !(period in CHART_PERIODS)) {
  //   period = DEFAULT_PERIOD;
  // }

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(symbol);

  useEffect(() => {
   
    if (chartToken && "maxPrice" in chartToken && chartToken.minPrice !== undefined) {
   
      const averagePrice = getMidPrice(chartToken);
   
      const formattedPrice = bigintToNumber(averagePrice, USD_DECIMALS);
   
      dataProvider?.setCurrentChartToken({
        price: formattedPrice,
        ticker: chartToken.symbol,
        isChartReady: chartReady,
      });
    }
  }, [chartToken, chartReady, dataProvider, chainId, oraclePriceDecimals]);

  const drawLineOnChart = useCallback(
    (title: string, price: number) => {
      if (chartReady && tvWidgetRef.current?.activeChart?.().dataReady()) {
        const chart = tvWidgetRef.current.activeChart();
        const positionLine = chart.createPositionLine({ disableUndo: true });

        return positionLine
          .setText(title)
          .setPrice(price)
          .setQuantity("")
          .setLineStyle(1)
          .setLineLength(1)
          .setBodyFont(`normal 12pt "Relative", sans-serif`)
          .setBodyTextColor("#fff")
          .setLineColor("#3a3e5e")
          .setBodyBackgroundColor("#3a3e5e")
          .setBodyBorderColor("#3a3e5e");
      }
    },
    [chartReady]
  );

  /* Tradingview charting library only fetches the historical data once so if the tab is inactive or system is in sleep mode
  for a long time, the historical data will be outdated. */
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === "hidden") {
  //       localStorage.setItem(TV_CHART_RELOAD_TIMESTAMP_KEY, Date.now().toString());
  //     } else {
  //       const tvReloadTimestamp = Number(localStorage.getItem(TV_CHART_RELOAD_TIMESTAMP_KEY));
  //       if (tvReloadTimestamp && Date.now() - tvReloadTimestamp > TV_CHART_RELOAD_INTERVAL) {
  //         if (resetCache) {
  //           resetCache();
  //           tvWidgetRef.current?.activeChart().resetData();
  //         }
  //       }
  //     }
  //   };

  //   document.addEventListener("visibilitychange", handleVisibilityChange);

  //   return () => {
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //   };
  // }, [resetCache]);



  useEffect(
    function updateLines() {
      const lines: (IPositionLineAdapter | undefined)[] = [];
      if (savedShouldShowPositionLines) {
        chartLines.forEach((order) => {
          lines.push(drawLineOnChart(order.title, order.price));
        });
      }
      return () => {
        lines.forEach((line) => line?.remove());
      };
    },
    [chartLines, savedShouldShowPositionLines, drawLineOnChart]
  );

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      if (isChartAvailabeForToken(chainId, symbol)) {
        tvWidgetRef.current.setSymbol(
          getSymbolName(symbol, visualMultiplier),
          tvWidgetRef.current.activeChart().resolution(),
          () => null
        );
      }
    }
  }, [symbol, chartReady, period, chainId, datafeed, visualMultiplier]);

  // useEffect(() => {
  //   if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
  //     if (isChartAvailabeForToken(chainId, symbol)) {
  //       tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => {});
  //     }
  //   }
  // }, [symbol, chartReady, period, chainId]);

  const themeContext = useContext(ThemeContext);

  useEffect(() => {
    const widgetOptions = {
      debug: false,
      symbol: symbolRef.current, // Using ref to avoid unnecessary re-renders on symbol change and still have access to the latest symbol
      datafeed: datafeed,
      theme: themeContext.isLight ? "Light" : "Dark",
      container: chartContainerRef.current,
      library_path: defaultChartProps.library_path,
      locale: defaultChartProps.locale,
      loading_screen: defaultChartProps.loading_screen,
      enabled_features: defaultChartProps.enabled_features,
      disabled_features: isMobile
        ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
        : defaultChartProps.disabled_features,
      client_id: defaultChartProps.clientId,
      user_id: defaultChartProps.userId,
      fullscreen: defaultChartProps.fullscreen,
      autosize: defaultChartProps.autosize,
      custom_css_url: defaultChartProps.custom_css_url,
      overrides: defaultChartProps.overrides,
      interval: getObjectKeyFromValue(period, SUPPORTED_RESOLUTIONS),
      favorites: defaultChartProps.favorites,
      custom_formatters: defaultChartProps.custom_formatters,
      save_load_adapter: new SaveLoadAdapter(chainId, tvCharts, setTvCharts, onSelectToken),
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
    tvWidgetRef.current!.onChartReady(function () {
      setChartReady(true);
      tvWidgetRef.current!.applyOverrides({
        "paneProperties.background": themeContext.isLight ? "#FFFFFF" : "#0E1020",
        "paneProperties.backgroundType": "solid",
        "scalesProperties.textColor": themeContext.isLight ? "#000000" : "#FFFFFF",
        "paneProperties.vertGridProperties.style": "1",
        "paneProperties.horzGridProperties.style": "1",
      });
      tvWidgetRef.current
        ?.activeChart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          if (SUPPORTED_RESOLUTIONS[interval]) {
            const period = SUPPORTED_RESOLUTIONS[interval];
            setPeriod(period);
          }
        });

      tvWidgetRef.current?.activeChart().dataReady(() => {
        setChartDataLoading(false);
      });
    });

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
        setChartReady(false);
        setChartDataLoading(true);
      }
    };
    // We don't want to re-initialize the chart when the symbol changes. This will make the chart flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return (
    <div className="ExchangeChart-error">
      {chartDataLoading && <Loader />}
      <div
        style={{ visibility: !chartDataLoading ? "visible" : "hidden" }}
        ref={chartContainerRef}
        className="TVChartContainer ExchangeChart-bottom-content"
      />
    </div>
  );
}
