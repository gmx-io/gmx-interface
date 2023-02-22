import { HistoryCallback, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { SymbolInfo } from "./types";

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
  const feedData = useRef<boolean>(true);
  const activeTicker = useRef<string | undefined>();
  const lastTimestamp = useRef<number>(0);
  const tvDataProvider = useRef<TVDataProvider>();

  useEffect(() => {
    if (dataProvider && tvDataProvider.current !== dataProvider) {
      tvDataProvider.current = dataProvider;
    }
  }, [dataProvider]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        feedData.current = false;
      } else {
        feedData.current = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return useMemo(() => {
    return {
      resetCache: resetCacheRef,
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
          if (!SUPPORTED_RESOLUTIONS[resolution]) {
            return onErrorCallback("[getBars] Invalid resolution");
          }
          const { ticker, isStable } = symbolInfo;
          if (activeTicker.current !== ticker) {
            activeTicker.current = ticker;
          }

          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }
            const bars = await tvDataProvider.current?.getHistoryBars(
              chainId,
              ticker,
              resolution,
              isStable,
              periodParams
            );
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
          _subscribeUID,
          onResetCacheNeededCallback: () => void
        ) {
          const { ticker, isStable } = symbolInfo;
          if (!ticker) {
            return;
          }
          intervalRef.current && clearInterval(intervalRef.current);
          resetCacheRef.current = onResetCacheNeededCallback;
          if (!isStable) {
            intervalRef.current = setInterval(async function () {
              if (!feedData.current) return;
              tvDataProvider.current
                ?.syncPastBars(chainId, ticker, resolution, lastTimestamp.current)
                .then((bars) => {
                  if (bars?.length > 0 && ticker === activeTicker.current) {
                    bars.forEach((bar) => {
                      onRealtimeCallback(bar);
                    });
                  }
                })
                .then(() => {
                  tvDataProvider.current?.getLiveBar(chainId, ticker, resolution).then((bar) => {
                    if (bar && ticker === activeTicker.current) {
                      lastTimestamp.current = bar.time;
                      onRealtimeCallback(bar);
                    }
                  });
                });
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
