import { getTokens } from "config/tokens";
import { getChainlinkChartPricesFromGraph, getChartPricesFromStats, getStablePriceData } from "domain/prices";

export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1H", 240: "4H", "1D": "1D" };

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

async function getTokenChartPrice(chainId, symbol, period) {
  let prices;
  try {
    prices = await getChartPricesFromStats(chainId, symbol, period);
  } catch (ex) {
    console.warn(ex);
    console.warn("Switching to graph chainlink data");
    try {
      prices = await getChainlinkChartPricesFromGraph(symbol, period);
    } catch (ex2) {
      console.warn("getChainlinkChartPricesFromGraph failed");
      console.warn(ex2);
      prices = [];
    }
  }
  return prices;
}

async function getBars(chainId, symbol, period, isStable) {
  const prices = isStable ? getStablePriceData(period) : await getTokenChartPrice(chainId, symbol, period);
  return prices.map((bar) => {
    return {
      time: bar.time * 1000,
      low: bar.low,
      high: bar.high,
      open: bar.open,
      close: bar.close,
    };
  });
}
const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback(configurationData));
  },
  resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    const symbolInfo = (ticker) => {
      const [symbol, chainId] = ticker.split("_");
      const stableTokens = getTokens(chainId)
        .filter((t) => t.isStable)
        .map((t) => t.symbol);

      return {
        name: symbol,
        description: symbol + " / USD",
        ticker: symbol,
        session: "24x7",
        minmov: 1,
        pricescale: 100, // 	or 100
        timezone: "UTC",
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        currency_code: "USD",
        chainId: Number(chainId),
        isStable: stableTokens.includes(symbol),
      };
    };

    return onSymbolResolvedCallback(symbolInfo(symbolName));
  },

  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    if (!supportedResolutions[resolution]) {
      return onErrorCallback("[getBars] Invalid resolution");
    }
    const { ticker, chainId, isStable } = symbolInfo;
    const period = supportedResolutions[resolution].toLowerCase();
    const bars = await getBars(chainId, ticker, period, isStable);
    bars.length > 0 ? onHistoryCallback(bars) : onErrorCallback("Sorry, data fetching error");
  },
  calculateHistoryDepth: (resolution, resolutionBack, intervalBack) => {
    return resolution < 60 ? { resolutionBack: "D", intervalBack: "1" } : undefined;
  },
  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
    // console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID)
    // // Global variable
    window.interval = setInterval(function () {
      // getLastKline(symbolInfo.ticker, resolution).then((kline) => {
      //   console.log(kline);
      //   onRealtimeCallback(kline);
      // });
    }, 1000 * 60); // 60s update interval
  },
  unsubscribeBars: (subscriberUID) => {
    // console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID)
    // clearInterval(window.interval)
    // console.log('[unsubscribeBars]: cleared')
  },
};

export default Datafeed;
