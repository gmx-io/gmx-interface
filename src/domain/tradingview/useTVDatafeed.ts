import { HistoryCallback, IDatafeedChartApi, IExternalDatafeed, PeriodParams, ResolutionString, SubscribeBarsCallback } from "charting_library";
import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { useDynamicChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { Bar, FromOldToNewArray, SymbolInfo } from "./types";
import { formatTimeInBarToMs, multiplyBarValues } from "./utils";

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

export type TvDatafeed = Partial<IExternalDatafeed & IDatafeedChartApi>;

export default function useTVDatafeed({ dataProvider }: Props) {
  const { chainId } = useDynamicChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const resetCacheRef = useRef<() => void | undefined>();
  const lastBarTime = useRef<number>(0);
  const activeTicker = useRef<string | undefined>();
  const tvDataProvider = useRef<TVDataProvider>();
  const shouldRefetchBars = useRef<boolean>(false);

  const missingBarsInfo = useRef({
    bars: [] as FromOldToNewArray<Bar>,
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

  const supportedResolutions = useMemo(() => dataProvider?.resolutions || SUPPORTED_RESOLUTIONS, [dataProvider]);


  useEffect(() => {
    if (dataProvider && tvDataProvider.current !== dataProvider) {
      tvDataProvider.current = dataProvider;
    }
  }, [dataProvider]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        feedData.current = true;
        missingBarsInfo.current.isFetching = true;
        const ticker = tvDataProvider.current?.currentTicker;
        const period = tvDataProvider.current?.currentPeriod;
        if (ticker && period && lastBarTime.current && !stableTokens.includes(ticker)) {
          let data: FromOldToNewArray<Bar> = [];
          try {
            data = (await tvDataProvider.current!.getMissingBars(chainId, ticker, period, lastBarTime.current)) || [];
          } catch (e) {
            data = [];
          }
          missingBarsInfo.current.bars = data;
          missingBarsInfo.current.isFetching = false;
        } else {
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
           console.log("resolve symbol", symbolName);
          if(symbolName === '1@WBTC')
            symbolName = 'WBTC'
          else if(symbolName === '1@ETH')
            symbolName = "ETH";
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

          // console.log("useTVDatafeed.getBars", ticker, resolution, isStable, periodParams, shouldRefetchBars.current);

          try {
            if (!ticker) {
              onErrorCallback("Invalid ticker!");
              return;
            }


            tvDataProvider.current?.saveTVParamsCache(chainId, {
            resolution,
            countBack: periodParams.countBack,
          });

          let bars =
          (await tvDataProvider.current?.getBars(chainId, ticker, resolution, isStable, periodParams)) || [];

         // const visualMultiplier = symbolInfo.visualMultiplier;
            // const bars = await tvDataProvider.current?.getBars(
            //   chainId,
            //   ticker,
            //   resolution,
            //   isStable,
            //   periodParams,
            //   shouldRefetchBars.current
            // );
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
          if (!ticker) {
            return;
          }
          intervalRef.current && clearInterval(intervalRef.current);
          resetCacheRef.current = onResetCacheNeededCallback;
          if (!isStable) {
            intervalRef.current = setInterval(function () {
              tvDataProvider.current?.getLiveBars(chainId, ticker, period)?.forEach((bar) => {
                if (
                  bar &&
                  bar.ticker === tvDataProvider.current?.currentTicker &&
                  bar.period === tvDataProvider.current?.currentPeriod &&
                  (!lastBarTime.current || bar.time >= lastBarTime.current)
                ) {
                  lastBarTime.current = bar.time;
        
                  onRealtimeCallback(multiplyBarValues(formatTimeInBarToMs(bar), symbolInfo.visualMultiplier));
                }
              });
              // tvDataProvider.current?.getLiveBars(chainId, ticker, resolution).then((bar) => {
              //   if (bar && ticker === activeTicker.current) {
              //     onRealtimeCallback(formatTimeInBarToMs(bar));
              //   }
              // });
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
