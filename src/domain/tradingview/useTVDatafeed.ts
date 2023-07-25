import { HistoryCallback, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getPriceDecimals, getTokens, isChartAvailabeForToken } from "config/tokens";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { Bar, SymbolInfo } from "./types";
import { formatTimeInBarToMs } from "./utils";
import { SUPPORTED_RESOLUTIONS_V1 } from "config/tradingview";

function getConfigurationData(supportedResolutions) {
  return {
    supported_resolutions: Object.keys(supportedResolutions),
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
    reset_cache_timeout: 100,
  };
}

type Props = {
  dataProvider?: TVDataProvider;
};

export default function useTVDatafeed({ dataProvider }: Props) {
  const { chainId } = useChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const tvDataProvider = useRef<TVDataProvider>();
  const lastBarTime = useRef<number>(0);
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

  const supportedResolutions = useMemo(() => dataProvider?.resolutions || SUPPORTED_RESOLUTIONS_V1, [dataProvider]);

  useEffect(() => {
    if (dataProvider && tvDataProvider.current !== dataProvider) {
      tvDataProvider.current = dataProvider;
    }
  }, [dataProvider]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        missingBarsInfo.current.isFetching = true;
        const ticker = tvDataProvider.current?.currentTicker;
        const period = tvDataProvider.current?.currentPeriod;
        if (ticker && period && lastBarTime.current && !stableTokens.includes(ticker)) {
          let data;
          try {
            data = await tvDataProvider.current?.getMissingBars(chainId, ticker, period, lastBarTime.current);
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
          setTimeout(() => callback(getConfigurationData(supportedResolutions)));
        },
        resolveSymbol(symbolName, onSymbolResolvedCallback) {
          if (!isChartAvailabeForToken(chainId, symbolName)) {
            symbolName = getNativeToken(chainId).symbol;
          }

          const pricescale = Math.pow(10, getPriceDecimals(chainId, symbolName));

          const symbolInfo = {
            name: symbolName,
            type: "crypto",
            description: symbolName + " / USD",
            ticker: symbolName,
            session: "24x7",
            minmov: 1,
            pricescale: pricescale,
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
          if (!supportedResolutions[resolution]) {
            return onErrorCallback("[getBars] Invalid resolution");
          }
          const { ticker, isStable } = symbolInfo;
          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }
            const bars = await tvDataProvider.current?.getBars(chainId, ticker, resolution, isStable, periodParams);

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
          const period = supportedResolutions[resolution];
          const { ticker, isStable } = symbolInfo;
          if (!ticker) {
            return;
          }

          intervalRef.current && clearInterval(intervalRef.current);

          const handleInterval = () => {
            if (missingBarsInfo.current.isFetching || !feedData.current) return;
            if (missingBarsInfo.current.bars?.length > 0) {
              missingBarsInfo.current.bars.forEach((bar: any) => {
                onRealtimeCallback(formatTimeInBarToMs(bar));
                missingBarsInfo.current.bars = missingBarsInfo.current.bars.filter((b: Bar) => b.time !== bar.time);
              });
            } else {
              tvDataProvider.current?.getLiveBar(chainId, ticker, period).then((bar) => {
                if (
                  bar &&
                  bar.ticker === tvDataProvider.current?.currentTicker &&
                  bar.period === tvDataProvider.current?.currentPeriod
                ) {
                  lastBarTime.current = bar.time;
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
  }, [chainId, stableTokens, supportedResolutions]);
}
