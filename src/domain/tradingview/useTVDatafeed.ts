import { getNativeToken, getTokens, isChartAvailabeForToken } from "config/tokens";
import { SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { timezoneOffset } from "domain/prices";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useRef } from "react";
import { TVRequests } from "./TVRequests";

const configurationData = {
  supported_resolutions: Object.keys(SUPPORTED_RESOLUTIONS),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
  reset_cache_timeout: 100,
};

export default function useTVDatafeed() {
  const { chainId } = useChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const resetCacheRef = useRef<() => void | undefined>();
  const activeTicker = useRef<string | undefined>();
  const tvRequests = useRef<TVRequests>();

  useEffect(() => {
    tvRequests.current = new TVRequests();
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

        async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
          const { from, to, countBack } = periodParams;
          const toWithOffset = (to + timezoneOffset) * 1000;
          const fromWithOffset = (from + timezoneOffset) * 1000;

          if (!SUPPORTED_RESOLUTIONS[resolution]) {
            return onErrorCallback("[getBars] Invalid resolution");
          }
          const { ticker, isStable } = symbolInfo;
          if (activeTicker.current !== ticker) {
            activeTicker.current = ticker;
          }

          try {
            const bars = await tvRequests.current?.getHistoryBars(chainId, ticker, resolution, isStable, countBack);
            const filteredBars = bars.filter((bar) => bar.time >= fromWithOffset && bar.time <= toWithOffset);
            onHistoryCallback(filteredBars, { noData: filteredBars.length === 0 });
          } catch {
            onErrorCallback("Unable to load historical bar data");
          }
        },

        async subscribeBars(symbolInfo, resolution, onRealtimeCallback, _subscribeUID, onResetCacheNeededCallback) {
          const { ticker, isStable } = symbolInfo;
          intervalRef.current && clearInterval(intervalRef.current);
          resetCacheRef.current = onResetCacheNeededCallback;
          if (!isStable) {
            intervalRef.current = setInterval(function () {
              tvRequests.current?.getLiveBar(chainId, ticker, resolution).then((bar) => {
                if (ticker === activeTicker.current) {
                  onRealtimeCallback(bar);
                }
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
