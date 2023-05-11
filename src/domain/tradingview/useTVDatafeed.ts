import { HistoryCallback, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { SymbolInfo } from "./types";
import { formatTimeInBarToMs } from "./utils";

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
  const resetCacheRef = useRef<() => void | undefined>();
  const activeTicker = useRef<string | undefined>();
  const activePeriod = useRef<string | undefined>();
  const tvDataProvider = useRef<TVDataProvider>();
  const shouldRefetchBars = useRef<boolean>(false);
  const lastLiveTime = useRef<number>(0);
  const missingData = useRef([]);
  const isFetching = useRef(false);

  useEffect(() => {
    if (dataProvider && tvDataProvider.current !== dataProvider) {
      tvDataProvider.current = dataProvider;
    }
  }, [dataProvider]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        isFetching.current = true;
        const data = await tvDataProvider.current?.getMissingBars(
          chainId,
          activeTicker.current!,
          activePeriod.current!,
          lastLiveTime.current
        );
        console.log("data", data);
        missingData.current = data || [];
        isFetching.current = false;
      } else {
        missingData.current = [];
        isFetching.current = false;
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
      resetCache: function () {
        shouldRefetchBars.current = true;
        resetCacheRef.current?.();
        shouldRefetchBars.current = false;
      },
      datafeed: {
        onReady: (callback) => {
          setTimeout(() => callback(configurationData));
        },
        resolveSymbol(symbolName, onSymbolResolvedCallback) {
          if (!isChartAvailabeForToken(chainId, symbolName)) {
            symbolName = getNativeToken(chainId).symbol;
          }

          const stableTokens = getTokens(chainId)
            .filter((t) => t.isStable)
            .map((t) => t.symbol);
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
          if (activeTicker.current !== ticker) {
            activeTicker.current = ticker;
          }
          if (activePeriod.current !== period) {
            activePeriod.current = period;
          }

          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }
            const bars = await tvDataProvider.current?.getBars(
              chainId,
              ticker,
              period,
              isStable,
              periodParams,
              shouldRefetchBars.current
            );
            const noData = !bars || bars.length === 0;
            onHistoryCallback(bars, { noData });
          } catch {
            onErrorCallback("Unable to load historical data!");
          }
        },
        // async subscribeBars(
        //   symbolInfo: SymbolInfo,
        //   resolution: ResolutionString,
        //   onRealtimeCallback: SubscribeBarsCallback,
        //   _subscribeUID,
        //   onResetCacheNeededCallback: () => void
        // ) {
        //   const period = SUPPORTED_RESOLUTIONS[resolution];
        //   const { ticker, isStable } = symbolInfo;
        //   if (!ticker || !period) {
        //     return;
        //   }
        //   intervalRef.current && clearInterval(intervalRef.current);
        //   resetCacheRef.current = onResetCacheNeededCallback;
        //   if (!isStable) {
        //     intervalRef.current = setInterval(function () {
        //       if (isFetching.current) return;
        //       if (missingData.current.length > 0) {
        //         missingData.current.forEach((bar) => {
        //           onRealtimeCallback(formatTimeInBarToMs(bar));
        //           missingData.current = [];
        //         });
        //       } else {
        //         tvDataProvider.current?.getLiveBar(chainId, ticker, period).then((bar) => {
        //           if (bar && bar.ticker === activeTicker.current && bar.period === activePeriod.current) {
        //             lastLiveTime.current = bar.time;
        //             onRealtimeCallback(formatTimeInBarToMs(bar));
        //           }
        //         });
        //       }
        //     }, 500);
        //   }
        // },
        async subscribeBars(
          symbolInfo: SymbolInfo,
          resolution: ResolutionString,
          onRealtimeCallback: SubscribeBarsCallback,
          _subscribeUID,
          onResetCacheNeededCallback: () => void
        ) {
          const period = SUPPORTED_RESOLUTIONS[resolution];
          const { ticker, isStable } = symbolInfo;
          if (!ticker || !period) {
            return;
          }
          intervalRef.current && clearInterval(intervalRef.current);
          resetCacheRef.current = onResetCacheNeededCallback;

          if (!isStable) {
            intervalRef.current = setInterval(function () {
              if (isFetching.current) return;
              console.log(isFetching.current);
              if (missingData.current.length > 0) {
                missingData.current.forEach((bar) => {
                  onRealtimeCallback(formatTimeInBarToMs(bar));
                });
              } else {
                tvDataProvider.current?.getLiveBar(chainId, ticker, period).then((bar) => {
                  if (bar && bar.ticker === activeTicker.current && bar.period === activePeriod.current) {
                    console.log("bar inside interval", bar);
                    lastLiveTime.current = bar.time;
                    onRealtimeCallback(formatTimeInBarToMs(bar));
                  }
                });
              }
            }, 500);
          }
        },

        unsubscribeBars: () => {
          intervalRef.current && clearInterval(intervalRef.current);
        },
      },
    };
  }, [chainId]);
}
