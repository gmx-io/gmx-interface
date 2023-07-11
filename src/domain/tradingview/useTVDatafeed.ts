import { HistoryCallback, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { SymbolInfo } from "./types";
import { formatTimeInBarToMs } from "./utils";

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
  supportedResolutions: { [key: number]: string };
};

export default function useTVDatafeed({ dataProvider, supportedResolutions }: Props) {
  const { chainId } = useChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const resetCacheRef = useRef<() => void | undefined>();
  const tvDataProvider = useRef<TVDataProvider>();
  const shouldRefetchBars = useRef<boolean>(false);

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

  return useMemo(() => {
    return {
      resetCache: function () {
        shouldRefetchBars.current = true;
        resetCacheRef.current?.();
        shouldRefetchBars.current = false;
      },
      datafeed: {
        onReady: (callback) => {
          setTimeout(() => callback(getConfigurationData(supportedResolutions)));
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
          if (!supportedResolutions[resolution]) {
            return onErrorCallback("[getBars] Invalid resolution");
          }
          const { ticker, isStable } = symbolInfo;
          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }
            const bars = await tvDataProvider.current?.getBars(
              chainId,
              ticker,
              resolution,
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
        async subscribeBars(
          symbolInfo: SymbolInfo,
          resolution: ResolutionString,
          onRealtimeCallback: SubscribeBarsCallback,
          _subscribeUID,
          onResetCacheNeededCallback: () => void
        ) {
          const period = supportedResolutions[resolution];
          const { ticker, isStable } = symbolInfo;
          if (!ticker || !period) {
            return;
          }
          intervalRef.current && clearInterval(intervalRef.current);
          resetCacheRef.current = onResetCacheNeededCallback;
          if (!isStable) {
            intervalRef.current = setInterval(function () {
              tvDataProvider.current?.getLiveBar(chainId, ticker, period).then((bar) => {
                if (
                  bar &&
                  bar.ticker === tvDataProvider.current?.currentTicker &&
                  bar.period === tvDataProvider.current?.currentPeriod
                ) {
                  onRealtimeCallback(formatTimeInBarToMs(bar));
                }
              });
            }, 500);
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
