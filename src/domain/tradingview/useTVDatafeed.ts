import { HistoryCallback, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { Bar, SymbolInfo } from "./types";
import { formatTimeInBarToMs } from "./utils";

type ChartInfo = {
  ticker: string;
  period: string;
  lastBarTime: number;
};

const configurationData = {
  supported_resolutions: Object.keys(SUPPORTED_RESOLUTIONS),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
  reset_cache_timeout: 100,
};

type Props = {
  dataProvider?: TVDataProvider;
};

export default function useTVDatafeed({ dataProvider }: Props) {
  const { chainId } = useChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const tvDataProvider = useRef<TVDataProvider>();
  const chartInfo = useRef<ChartInfo>({
    ticker: "",
    period: "",
    lastBarTime: 0,
  });
  const missingBarsInfo = useRef({
    bars: [],
    isFetching: false,
  });

  const feedData = useRef(true);

  const stableTokens = useMemo(
    () =>
      getTokens(chainId)
        .filter((t) => t.isStable)
        .map((t) => t.symbol),
    [chainId]
  );

  useEffect(() => {
    if (dataProvider && tvDataProvider.current !== dataProvider) {
      tvDataProvider.current = dataProvider;
    }
  }, [dataProvider]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        missingBarsInfo.current.isFetching = true;
        const { ticker, period, lastBarTime } = chartInfo.current;
        if (ticker && period && lastBarTime && !stableTokens.includes(ticker)) {
          let data;
          try {
            data = await tvDataProvider.current?.getMissingBars(chainId, ticker, period, chartInfo.current.lastBarTime);
          } catch (e) {
            data = [];
          }
          missingBarsInfo.current.bars = data;
          missingBarsInfo.current.isFetching = false;
          feedData.current = true;
        } else {
          feedData.current = false;
          missingBarsInfo.current.isFetching = false;
          missingBarsInfo.current.bars = [];
        }
      } else {
        feedData.current = false;
        missingBarsInfo.current.isFetching = false;
        missingBarsInfo.current.bars = [];
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    return {
      datafeed: {
        onReady: (callback) => {
          setTimeout(() => callback(configurationData));
        },
        resolveSymbol(symbolName, onSymbolResolvedCallback) {
          if (!isChartAvailabeForToken(chainId, symbolName)) {
            symbolName = getNativeToken(chainId).symbol;
          }

          const symbolInfo = {
            name: symbolName,
            type: "crypto",
            description: symbolName + " / USD",
            ticker: symbolName,
            session: "24x7",
            minmov: 1,
            pricescale: 100,
            timezone: "Etc/UTC",
            has_intraday: true,
            has_daily: true,
            currency_code: "USD",
            visible_plots_set: "ohlc",
            data_status: "streaming",
            isStable: stableTokens.includes(symbolName),
          };
          setTimeout(() => onSymbolResolvedCallback(symbolInfo));
        },

        async getBars(
          symbolInfo: SymbolInfo,
          resolution: ResolutionString,
          periodParams: PeriodParams,
          onHistoryCallback: HistoryCallback,
          onErrorCallback: (error: string) => void
        ) {
          const period = SUPPORTED_RESOLUTIONS[resolution];
          if (!period) {
            return onErrorCallback("Invalid period!");
          }
          const { ticker, isStable } = symbolInfo;
          if (ticker && chartInfo.current.ticker !== ticker) {
            chartInfo.current.ticker = ticker;
          }
          if (period && chartInfo.current.period !== period) {
            chartInfo.current.period = period;
          }

          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }
            const bars = await tvDataProvider.current?.getBars(chainId, ticker, period, isStable, periodParams);
            const noData = !bars || bars.length === 0;
            onHistoryCallback(bars, { noData });
          } catch {
            onErrorCallback("Unable to load historical data!");
          }
        },

        async subscribeBars(
          symbolInfo: SymbolInfo,
          resolution: ResolutionString,
          onRealtimeCallback: SubscribeBarsCallback,
          _subscribeUID
        ) {
          const period = SUPPORTED_RESOLUTIONS[resolution];
          const { ticker, isStable } = symbolInfo;
          if (!ticker) {
            return;
          }

          intervalRef.current && clearInterval(intervalRef.current);

          const handleInterval = () => {
            if (missingBarsInfo.current.isFetching || !feedData.current) return;

            const bars = missingBarsInfo.current.bars;
            if (bars?.length > 0) {
              bars.forEach((bar: Bar) => {
                onRealtimeCallback(formatTimeInBarToMs(bar));
                missingBarsInfo.current.bars = missingBarsInfo.current.bars.filter((b: Bar) => b.time !== bar.time);
              });
            } else {
              tvDataProvider.current?.getLiveBar(chainId, ticker, period).then((bar) => {
                if (bar && bar.ticker === chartInfo.current.ticker && bar.period === chartInfo.current.period) {
                  chartInfo.current.lastBarTime = bar.time;
                  onRealtimeCallback(formatTimeInBarToMs(bar));
                }
              });
            }
          };

          if (!isStable) {
            intervalRef.current = setInterval(handleInterval, 500);
          }
        },
        unsubscribeBars: (id) => {
          // id is in the format ETH_#_USD_#_5
          const ticker = id.split("_")[0];
          const isStable = stableTokens.includes(ticker);
          if (!isStable && intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        },
      },
    };
  }, [chainId, stableTokens]);
}
