import Loader from "components/Common/Loader";
import { ARBITRUM } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import {
  getSyntheticsTradeOptionsKey,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  TV_SAVE_LOAD_CHARTS_KEY,
} from "config/localStorage";
import { getNativeToken, getPriceDecimals, getToken, getV2Tokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V1, SUPPORTED_RESOLUTIONS_V2 } from "config/tradingview";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { SyntheticsTVDataProvider } from "domain/synthetics/tradingview/SyntheticsTVDataProvider";
import { getMidPrice, Token, TokenPrices } from "domain/tokens";
import { buildFeeder } from "domain/tradingview/useTVDatafeed";
import { getObjectKeyFromValue } from "domain/tradingview/utils";
import { formatAmount } from "lib/numbers";
import { OracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { useTradePageVersion } from "lib/useTradePageVersion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage, useMedia } from "react-use";
import { ChartData, IPositionLineAdapter } from "../../charting_library";
import { defaultChartProps, disabledFeaturesOnMobile } from "./constants";
import { StoredTradeOptions } from "domain/synthetics/trade/useTradeboxState";
import { SaveLoadAdapter } from "./SaveLoadAdapter";

const CHAIN_ID = parseInt(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || "") || ARBITRUM;

const raw = localStorage.getItem(JSON.stringify(getSyntheticsTradeOptionsKey(CHAIN_ID)));
const parsed = raw ? (JSON.parse(raw) as StoredTradeOptions) : undefined;
const symbol = parsed?.tokens.indexTokenAddress
  ? getToken(CHAIN_ID, parsed.tokens.indexTokenAddress).symbol
  : getNativeToken(CHAIN_ID).symbol;

const element = document.createElement("div");
element.className = "TVChartContainer ExchangeChart-bottom-content";
element.id = "init";
// element.style.visibility = "visible";
element.style.zIndex = "-1";
element.style.position = "absolute";
element.style.top = "-1000px";
element.style.left = "-1000px";

document.body.appendChild(element);

const fetcher = new OracleKeeperFetcher({
  chainId: CHAIN_ID,
  oracleKeeperIndex: 0,
  forceIncentivesActive: true,
});

const dataProvider = new SyntheticsTVDataProvider({
  chainId: CHAIN_ID,
  resolutions: SUPPORTED_RESOLUTIONS_V2,
  oracleFetcher: fetcher,
});

const cachedParams = dataProvider.getInitialTVParamsFromCache(CHAIN_ID);

dataProvider?.initializeBarsRequest(CHAIN_ID, symbol);

const tvDataProviderRef = {
  current: dataProvider,
};

const intervalRef = {
  current: undefined,
};

const missingBarsInfoRef = {
  current: {
    bars: [],
    isFetching: false,
  },
};

const feedDataRef = {
  current: false,
};

const lastBarTimeRef = {
  current: 0,
};

const { datafeed } = buildFeeder({
  chainId: CHAIN_ID,
  stableTokens: getV2Tokens(CHAIN_ID)
    .filter((t) => t.isStable)
    .map((t) => t.symbol),
  supportedResolutions: SUPPORTED_RESOLUTIONS_V2,
  tvDataProviderRef,
  intervalRef,
  missingBarsInfoRef,
  feedDataRef,
  lastBarTimeRef,
});

const widgetOptions = {
  debug: false,
  symbol: symbol, // Using ref to avoid unnecessary re-renders on symbol change and still have access to the latest symbol
  datafeed: datafeed,
  theme: defaultChartProps.theme,
  container: element,
  library_path: defaultChartProps.library_path,
  locale: defaultChartProps.locale,
  loading_screen: defaultChartProps.loading_screen,
  enabled_features: defaultChartProps.enabled_features,
  // disabled_features: isMobile
  //   ? defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile)
  //   : defaultChartProps.disabled_features,
  disabled_features: defaultChartProps.disabled_features.concat(disabledFeaturesOnMobile),
  client_id: defaultChartProps.clientId,
  user_id: defaultChartProps.userId,
  fullscreen: defaultChartProps.fullscreen,
  autosize: defaultChartProps.autosize,
  custom_css_url: defaultChartProps.custom_css_url,
  overrides: defaultChartProps.overrides,
  interval: cachedParams?.resolution ? cachedParams?.resolution : getObjectKeyFromValue("5m", SUPPORTED_RESOLUTIONS_V2),
  favorites: { ...defaultChartProps.favorites, intervals: Object.keys(SUPPORTED_RESOLUTIONS_V2) },
  custom_formatters: defaultChartProps.custom_formatters,
  // save_load_adapter: new SaveLoadAdapter(
  //   CHAIN_ID,
  //   tvCharts,
  //   setTvCharts,
  //   onSelectToken,
  //   tradePageVersion,
  //   setTradePageVersion
  // ),
};

const tvWidgetRef = {
  current: undefined as any,
};

const tvScript = document.getElementById("tsScript");

if (window.TradingView) {
  tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
} else if (tvScript) {
  tvScript.addEventListener("load", function () {
    console.log("tv script loaded");
    tvWidgetRef.current = new window.TradingView.widget(widgetOptions);
  });
}

let inited = false;

export type ChartLine = {
  price: number;
  title: string;
};

type Props = {
  symbol?: string;
  chainId: number;
  chartLines: ChartLine[];
  onSelectToken: (token: Token) => void;
  period: string;
  setPeriod: (period: string) => void;
  // dataProvider?: TVDataProvider;
  // datafeed: TvDatafeed;
  chartToken:
    | ({
        symbol: string;
      } & TokenPrices)
    | { symbol: string };
  supportedResolutions: typeof SUPPORTED_RESOLUTIONS_V1 | typeof SUPPORTED_RESOLUTIONS_V2;
  oraclePriceDecimals?: number;
};

export default function TVChartContainer({
  symbol,
  chainId,
  chartLines,
  onSelectToken,
  // dataProvider,
  // datafeed,
  period,
  setPeriod,
  chartToken,
  supportedResolutions,
  oraclePriceDecimals,
}: Props) {
  console.log("widget", tvWidgetRef);
  const { shouldShowPositionLines } = useSettings();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);

  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  const isMobile = useMedia("(max-width: 550px)");
  const symbolRef = useRef(symbol);

  useEffect(() => {
    if (chartToken && "maxPrice" in chartToken && chartToken.minPrice !== undefined) {
      let priceDecimals: number;

      try {
        priceDecimals = oraclePriceDecimals ?? getPriceDecimals(chainId, chartToken.symbol);
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
  }, [chartToken, chartReady, chainId, oraclePriceDecimals]);

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
    if (chartReady && tvWidgetRef.current && symbol && symbol !== tvWidgetRef.current?.activeChart?.().symbol()) {
      if (isChartAvailabeForToken(chainId, symbol)) {
        tvWidgetRef.current.setSymbol(symbol, tvWidgetRef.current.activeChart().resolution(), () => null);
      }
    }
  }, [symbol, chartReady, period, chainId]);

  useEffect(() => {
    // dataProvider?.resetCache();
    // if (symbolRef.current && getIsFlagEnabled("testCandlesPreload")) {
    //   dataProvider?.initializeBarsRequest(chainId, symbolRef.current);
    // }

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
        // tvWidgetRef.current.remove();
        // tvWidgetRef.current = null;
        element.style.display = "none";
        setChartReady(false);
        setChartDataLoading(true);
      }
    };
    // We don't want to re-initialize the chart when the symbol changes. This will make the chart flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, dataProvider]);

  useEffect(() => {
    if (chartContainerRef.current) {
      // chartContainerRef.current.appendChild(element);
      const rect = chartContainerRef.current.getBoundingClientRect();
      const chart = chartContainerRef.current;
      const body = document.body;
      const docEl = document.documentElement;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
      const clientTop = docEl.clientTop || body.clientTop || 0;
      const clientLeft = docEl.clientLeft || body.clientLeft || 0;

      const top = rect.top + scrollTop - clientTop;
      const left = rect.left + scrollLeft - clientLeft;

      element.style.display = "block";
      element.style.top = (top + 0).toString() + "px";
      element.style.left = left.toString() + "px";

      element.style.width = rect.width.toString() + "px";
      element.style.height = (rect.height - 0).toString() + "px";

      window.addEventListener("resize", (event) => {
        if (!chartContainerRef.current) {
          return;
        }

        const rect = chartContainerRef.current.getBoundingClientRect();
        const chart = chartContainerRef.current;
        const body = document.body;
        const docEl = document.documentElement;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
        const clientTop = docEl.clientTop || body.clientTop || 0;
        const clientLeft = docEl.clientLeft || body.clientLeft || 0;

        const top = rect.top + scrollTop - clientTop;
        const left = rect.left + scrollLeft - clientLeft;

        element.style.top = (top + 0).toString() + "px";
        element.style.left = left.toString() + "px";
        element.style.width = rect.width.toString() + "px";
        element.style.height = (rect.height - 0).toString() + "px";

        setTimeout(() => {
          if (!chartContainerRef.current) {
            return;
          }

          const rect = chartContainerRef.current.getBoundingClientRect();
          const chart = chartContainerRef.current;
          const body = document.body;
          const docEl = document.documentElement;
          const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
          const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
          const clientTop = docEl.clientTop || body.clientTop || 0;
          const clientLeft = docEl.clientLeft || body.clientLeft || 0;

          const top = rect.top + scrollTop - clientTop;
          const left = rect.left + scrollLeft - clientLeft;

          element.style.top = (top + 0).toString() + "px";
          element.style.left = left.toString() + "px";
          element.style.width = rect.width.toString() + "px";
          element.style.height = (rect.height - 0).toString() + "px";
        }, 1);
      });

      // element.style.width = rect.width.toString() + "px";
      // element.style.height = (rect.height - 10).toString() + "px";
      element.style.visibility = "visible";
      element.style.zIndex = "1";
      element.id = "two";
      console.log("element", element.style.top, element.style.left);

      inited = true;
    }
  }, []);

  // const style = useMemo<CSSProperties>(
  //   () => ({ visibility: !chartDataLoading ? "visible" : "hidden" }),
  //   [chartDataLoading]
  // );

  return (
    <div ref={chartContainerRef} className="ExchangeChart-error">
      <Loader />
      {/* <div
        id="container"
        style={style}
        ref={chartContainerRef}
        className="TVChartContainer ExchangeChart-bottom-content"
      /> */}
    </div>
  );
}
