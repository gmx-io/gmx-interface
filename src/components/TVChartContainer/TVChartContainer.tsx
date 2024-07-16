import Loader from "components/Common/Loader";
import { TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { getPriceDecimals, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V1, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { Token, TokenPrices, getMidPrice } from "domain/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
import { getObjectKeyFromValue } from "domain/tradingview/utils";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage, useMedia } from "react-use";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { defaultChartProps, disabledFeaturesOnMobile } from "./constants";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTradePageVersion } from "lib/useTradePageVersion";

export type ChartLine = {
  price: number;
  title: string;
};

type Props = {
  symbol: string;
  chainId: number;
  chartLines: ChartLine[];
  onSelectToken: (token: Token) => void;
  period: string;
  setPeriod: (period: string) => void;
  dataProvider?: TVDataProvider;
  chartToken:
    | ({
        symbol: string;
      } & TokenPrices)
    | { symbol: string };
  supportedResolutions: typeof SUPPORTED_RESOLUTIONS_V1 | typeof SUPPORTED_RESOLUTIONS_V2;
};

export default function TVChartContainer({
  symbol,
  chainId,
  chartLines,
  onSelectToken,
  dataProvider,
  period,
  setPeriod,
  chartToken,
  supportedResolutions,
}: Props) {
  const { shouldShowPositionLines } = useSettings();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const { datafeed } = useTVDatafeed({ dataProvider });
  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(symbol);

  useEffect(() => {
    if (chartToken && "maxPrice" in chartToken && chartToken.minPrice !== undefined) {
      let priceDecimals: number;

      try {
        priceDecimals = getPriceDecimals(chainId, chartToken.symbol);
      } catch (e) {
        return;
      }

      const averagePrice = getMidPrice(chartToken);
      const formattedPrice = parseFloat(formatAmount(averagePrice, USD_DECIMALS, priceDecimals));
      dataProvider?.setCurrentChartToken({
        price: formattedPrice,
        ticker: chartToken.symbol,
        isChartReady: chartReady,
      });
    }
  }, [chartToken, chartReady, dataProvider, chainId]);

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

  useEffect(
    function updateLines() {
      const lines: (IPositionLineAdapter | undefined)[] = [];
      if (shouldShowPositionLines) {
        chartLines.forEach((order) => {
          lines.push(drawLineOnChart(order.title, order.price));
        });
      }
      return () => {
        lines.forEach((line) => line?.remove());
      };
    },
    [chartLines, shouldShowPositionLines, drawLineOnChart]
  );

  useEffect(() => {
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      if (isChartAvailabeForToken(chainId, symbol)) {
        tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => null);
      }
    }
  }, [symbol, chartReady, period, chainId]);

  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  useEffect(() => {
    const widgetOptions = {
      debug: false,
      symbol: symbolRef.current, // Using ref to avoid unnecessary re-renders on symbol change and still have access to the latest symbol
      datafeed: datafeed,
      theme: defaultChartProps.theme,
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
      interval: getObjectKeyFromValue(period, supportedResolutions),
      favorites: { ...defaultChartProps.favorites, intervals: Object.keys(supportedResolutions) },
      custom_formatters: defaultChartProps.custom_formatters,
      save_load_adapter: new SaveLoadAdapter(
        chainId,
        tvCharts,
        setTvCharts,
        onSelectToken,
        tradePageVersion,
        setTradePageVersion
      ),
    };
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
    tvWidgetRef.current!.onChartReady(function () {
      setChartReady(true);
      tvWidgetRef.current!.applyOverrides({
        "paneProperties.background": "#16182e",
        "paneProperties.backgroundType": "solid",
      });
      tvWidgetRef.current
        ?.activeChart()
        .onIntervalChanged()
        .subscribe(null, (interval) => {
          if (supportedResolutions[interval]) {
            const period = supportedResolutions[interval];
            setPeriod(period);
          }
        });

      tvWidgetRef.current?.activeChart().dataReady(() => {
        setChartDataLoading(false);
      });
    });

    dataProvider?.resetCache();

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
  }, [chainId, dataProvider]);

  const style = useMemo<CSSProperties>(
    () => ({ visibility: !chartDataLoading ? "visible" : "hidden" }),
    [chartDataLoading]
  );

  return (
    <div className="ExchangeChart-error">
      {chartDataLoading && <Loader />}
      <div style={style} ref={chartContainerRef} className="TVChartContainer ExchangeChart-bottom-content" />
    </div>
  );
}
