import {
  DatafeedConfiguration,
  HistoryCallback,
  IDatafeedChartApi,
  IExternalDatafeed,
  LibrarySymbolInfo,
  PeriodParams,
  ResolutionString,
  SubscribeBarsCallback,
} from "charting_library";
import { getNativeToken, getPriceDecimals, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS_V1 } from "config/tradingview";
import { useChainId } from "lib/chains";
import { getRequestId, LoadingStartEvent, LoadingSuccessEvent, metrics } from "lib/metrics";
import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { TVDataProvider } from "./TVDataProvider";
import { Bar, FromOldToNewArray, SymbolInfo } from "./types";
import { formatTimeInBarToMs } from "./utils";
import { getIsFlagEnabled } from "config/ab";
import { calculatePriceDecimals, numberToBigint } from "lib/numbers";
import { USD_DECIMALS } from "config/factors";

let metricsRequestId: string | undefined = undefined;
let metricsIsFirstLoadTime = true;

function getConfigurationData(supportedResolutions): DatafeedConfiguration {
  const config: DatafeedConfiguration = {
    supported_resolutions: Object.keys(supportedResolutions) as ResolutionString[],
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
    reset_cache_timeout: 100,
  };

  return config;
}

type Props = {
  dataProvider?: TVDataProvider;
};

export default function useTVDatafeed({ dataProvider }: Props) {
  const { chainId } = useChainId();
  const intervalRef = useRef<Record<string, number>>({});
  const tvDataProvider = useRef<TVDataProvider>();
  const lastBarTime = useRef<number>(0);
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

  const supportedResolutions = useMemo(() => dataProvider?.resolutions || SUPPORTED_RESOLUTIONS_V1, [dataProvider]);

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
    return buildFeeder({
      chainId,
      stableTokens,
      supportedResolutions,
      tvDataProviderRef: tvDataProvider,
      intervalRef,
      missingBarsInfoRef: missingBarsInfo,
      feedDataRef: feedData,
      lastBarTimeRef: lastBarTime,
    });
  }, [chainId, stableTokens, supportedResolutions]);
}

export type TvDatafeed = Partial<IExternalDatafeed & IDatafeedChartApi>;

export function buildFeeder({
  chainId,
  stableTokens,
  supportedResolutions,
  tvDataProviderRef,
  intervalRef,
  missingBarsInfoRef,
  feedDataRef,
  lastBarTimeRef,
}: {
  chainId: number;
  stableTokens: string[];
  supportedResolutions: { [key: string]: string };
  tvDataProviderRef: MutableRefObject<TVDataProvider | undefined>;
  intervalRef: MutableRefObject<Record<string, number> | undefined>;
  missingBarsInfoRef: MutableRefObject<{
    bars: FromOldToNewArray<Bar>;
    isFetching: boolean;
  }>;
  feedDataRef: MutableRefObject<boolean>;
  lastBarTimeRef: MutableRefObject<number>;
}): { datafeed: TvDatafeed } {
  return {
    datafeed: {
      onReady: (callback) => {
        window.setTimeout(() => callback(getConfigurationData(supportedResolutions)));

        if (metricsIsFirstLoadTime) {
          metricsRequestId = getRequestId();

          metrics.pushEvent<LoadingStartEvent>({
            event: "candlesDisplay.started",
            isError: false,
            time: metrics.getTime("candlesDisplay"),
            data: {
              requestId: metricsRequestId,
            },
          });
        }
      },
      resolveSymbol(symbolName, onSymbolResolvedCallback) {
        if (!isChartAvailabeForToken(chainId, symbolName)) {
          symbolName = getNativeToken(chainId).symbol;
        }

        let pricescale = Math.pow(
          10,
          tvDataProviderRef.current?.currentPrice
            ? calculatePriceDecimals(numberToBigint(tvDataProviderRef.current.currentPrice, USD_DECIMALS), USD_DECIMALS)
            : getPriceDecimals(chainId, symbolName)
        );

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
        } as unknown as LibrarySymbolInfo;
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

          tvDataProviderRef.current?.saveTVParamsCache(chainId, {
            resolution,
            countBack: periodParams.countBack,
          });

          const bars =
            (await tvDataProviderRef.current?.getBars(chainId, ticker, resolution, isStable, periodParams)) || [];
          lastBarTimeRef.current = 0;
          const noData = !bars || bars.length === 0;

          if (metricsIsFirstLoadTime) {
            metricsRequestId = getRequestId();

            metrics.pushEvent<LoadingSuccessEvent>({
              event: "candlesDisplay.success",
              isError: false,
              time: metrics.getTime("candlesDisplay", true),
              data: {
                requestId: metricsRequestId!,
              },
            });

            metricsIsFirstLoadTime = false;
          }

          onHistoryCallback(bars, { noData });
        } catch (e) {
          console.error(e);
          onErrorCallback("Unable to load historical data!");
        }
      },
      async subscribeBars(
        symbolInfo: SymbolInfo,
        resolution: ResolutionString,
        onRealtimeCallback: SubscribeBarsCallback,
        listenerGuid: string
      ) {
        await subscribeBars({
          symbolInfo,
          resolution,
          onRealtimeCallback,
          chainId,
          missingBarsInfoRef,
          feedDataRef,
          lastBarTimeRef,
          intervalRef,
          supportedResolutions,
          tvDataProviderRef,
          listenerGuid,
        });
      },
      unsubscribeBars: (id) => {
        // id is in the format ETH_#_USD_#_5
        const ticker = id.split("_")[0];
        const isStable = stableTokens.includes(ticker);
        if (!isStable && intervalRef.current) {
          clearInterval(intervalRef.current[id]);
        }
      },
    },
  };
}

export function subscribeBars({
  symbolInfo,
  resolution,
  onRealtimeCallback,
  chainId,
  feedDataRef,
  intervalRef,
  supportedResolutions,
  tvDataProviderRef,
  lastBarTimeRef,
  missingBarsInfoRef,
  listenerGuid,
}: {
  symbolInfo: Pick<SymbolInfo, "ticker" | "isStable">;
  resolution: ResolutionString;
  onRealtimeCallback: SubscribeBarsCallback;
  chainId: number;
  supportedResolutions: { [key: string]: string };
  tvDataProviderRef: MutableRefObject<TVDataProvider | undefined>;
  intervalRef: MutableRefObject<Record<string, number> | undefined>;
  missingBarsInfoRef: MutableRefObject<{
    bars: FromOldToNewArray<Bar>;
    isFetching: boolean;
  }>;
  feedDataRef: MutableRefObject<boolean>;
  lastBarTimeRef: MutableRefObject<number>;
  listenerGuid: string;
}) {
  const period = supportedResolutions[resolution];
  const { ticker, isStable } = symbolInfo;
  if (!ticker) {
    return;
  }

  if (intervalRef.current !== undefined) {
    clearInterval(intervalRef.current[listenerGuid]);
    delete intervalRef.current[listenerGuid];
    tvDataProviderRef.current?.clearLiveBars();
  }

  const handleInterval = () => {
    if (missingBarsInfoRef.current.isFetching || !feedDataRef.current) return;
    if (missingBarsInfoRef.current.bars?.length > 0) {
      const processedBarTimes: FromOldToNewArray<number> = [];
      missingBarsInfoRef.current.bars.forEach((bar: Bar, index) => {
        if (processedBarTimes.includes(bar.time)) return;
        if (index !== 0 && bar.time < processedBarTimes.at(-1)!) {
          // eslint-disable-next-line no-console
          console.error(
            "missingBarsInfoRef bars order is violating TradingView api schema. See https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API#subscribebars"
          );
        }

        onRealtimeCallback(formatTimeInBarToMs(bar));
        processedBarTimes.push(bar.time);
      });
      missingBarsInfoRef.current.bars = [];
    } else {
      tvDataProviderRef.current?.getLiveBars(chainId, ticker, period)?.forEach((bar) => {
        if (
          bar &&
          bar.ticker === tvDataProviderRef.current?.currentTicker &&
          bar.period === tvDataProviderRef.current?.currentPeriod &&
          (!lastBarTimeRef.current || bar.time >= lastBarTimeRef.current)
        ) {
          lastBarTimeRef.current = bar.time;
          onRealtimeCallback(formatTimeInBarToMs(bar));
        }
      });
    }
  };

  if (!isStable && intervalRef.current) {
    intervalRef.current[listenerGuid] = window.setInterval(handleInterval, 500);
  }
}
