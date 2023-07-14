import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { useLocalStorage, useMedia } from "react-use";
import { defaultChartProps, disabledFeaturesOnMobile } from "./constants";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { getObjectKeyFromValue } from "domain/tradingview/utils";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { getNormalizedTokenSymbol, isChartAvailabeForToken } from "config/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import Loader from "components/Common/Loader";
import { BigNumber } from "ethers";
import { formatAmount } from "lib/numbers";
import { getMidPrice } from "domain/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { SUPPORTED_RESOLUTIONS_V1 } from "config/tradingview";

type ChartLine = {
  price: number;
  title: string;
};

type Props = {
  symbol: string;
  chainId: number;
  savedShouldShowPositionLines: boolean;
  chartLines: ChartLine[];
  onSelectToken: () => void;
  period: string;
  setPeriod: (period: string) => void;
  dataProvider?: TVDataProvider;
  chartToken: {
    symbol: string;
    minPrice: BigNumber;
    maxPrice: BigNumber;
  };
};

export default function TVChartContainer({
  symbol,
  chainId,
  savedShouldShowPositionLines,
  chartLines,
  onSelectToken,
  dataProvider,
  period,
  setPeriod,
  chartToken,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
  const { datafeed } = useTVDatafeed({ dataProvider });
  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(symbol);

  const supportedResolutions = useMemo(() => dataProvider?.resolutions || SUPPORTED_RESOLUTIONS_V1, [dataProvider]);

  useEffect(() => {
    if (chartToken.maxPrice && chartToken.minPrice) {
      const averagePrice = getMidPrice(chartToken);
      const formattedPrice = parseFloat(formatAmount(averagePrice, USD_DECIMALS, 2));
      dataProvider?.setCurrentChartToken({
        price: formattedPrice,
        ticker: getNormalizedTokenSymbol(chartToken.symbol),
        isChartReady: chartReady,
      });
    }
  }, [chartToken, chartReady, dataProvider]);

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
    if (chartReady && tvWidgetRef.current && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      if (isChartAvailabeForToken(chainId, symbol)) {
        tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => {});
      }
    }
  }, [symbol, chartReady, period, chainId]);

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
      save_load_adapter: new SaveLoadAdapter(chainId, tvCharts, setTvCharts, onSelectToken),
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
