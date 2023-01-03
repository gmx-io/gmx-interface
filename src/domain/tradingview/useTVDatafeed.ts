import { getTokens } from "config/tokens";
import { timezoneOffset } from "domain/prices";
import { useChainId } from "lib/chains";
import { useMemo, useRef } from "react";
import { getHistoryBars, getLiveBar, supportedResolutions } from "./helper";

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
  reset_cache_timeout: 100,
};

export default function useTVDatafeed() {
  const { chainId } = useChainId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>();
  const activeTicker = useRef();
  return useMemo(() => {
    return {
      onReady: (callback) => {
        setTimeout(() => callback(configurationData));
      },
      resolveSymbol: async (symbolName, onSymbolResolvedCallback) => {
        const symbolInfo = async (symbol) => {
          const stableTokens = getTokens(chainId)
            .filter((t) => t.isStable)
            .map((t) => t.symbol);

          return {
            name: symbol,
            type: "crypto",
            description: symbol + " / USD",
            ticker: symbol,
            session: "24x7",
            minmov: 1,
            pricescale: 100, // 	or 100
            timezone: "Etc/UTC",
            has_intraday: true,
            has_daily: true,
            currency_code: "USD",
            visible_plots_set: true,
            isStable: stableTokens.includes(symbol),
          };
        };
        const symbol = onSymbolResolvedCallback(await symbolInfo(symbolName));

        return symbol;
      },

      getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        const { from, to, countBack } = periodParams;
        const toWithOffset = to + timezoneOffset;

        if (!supportedResolutions[resolution]) {
          return onErrorCallback("[getBars] Invalid resolution");
        }
        const { ticker, isStable } = symbolInfo;
        if (activeTicker.current !== ticker) {
          activeTicker.current = ticker;
        }

        try {
          const bars = await getHistoryBars({
            chainId,
            ticker,
            resolution,
            isStable,
            countBack,
          });
          const filteredBars = bars.filter((bar) => bar.time >= from * 1000 && bar.time < toWithOffset * 1000);
          if (filteredBars.length > 0) {
            onHistoryCallback(filteredBars, { noData: false });
          } else {
            onHistoryCallback(filteredBars, { noData: true });
          }
        } catch {
          onErrorCallback("Something went wrong!");
        }
      },

      subscribeBars: async (symbolInfo, resolution, onRealtimeCallback) => {
        const { ticker, isStable } = symbolInfo;
        intervalRef.current && clearInterval(intervalRef.current);

        if (!isStable) {
          intervalRef.current = setInterval(function () {
            getLiveBar({ chainId, ticker, resolution }).then((bar) => {
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
    };
  }, [chainId, activeTicker]);
}
