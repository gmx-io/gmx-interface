import { getChainlinkChartPricesFromGraph, getChartPricesFromStats } from "../../../../Api";
import { ARBITRUM } from "../../../../Helpers";
// import historyProvider from "./historyProvider";

const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

const Datafeed = {
  onReady: (callback) => {
    // console.log("[onReady]: Method call");
    setTimeout(() => callback(configurationData));
  },
  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    // console.log("[resolveSymbol]: Method call", { symbolName });

    // const comps = symbolName.split(":");
    // symbolName = (comps.length > 1 ? comps[1] : symbolName).toUpperCase();

    const symbolInfo = (symbol) => ({
      name: symbol.symbol,
      description: symbol.baseAsset + " / " + "USD",
      ticker: symbol.symbol,
      session: "24x7",
      minmov: 1,
      pricescale: 100, // 	or 100
      timezone: "UTC",
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: true,
      currency_code: "USD",
    });

    // Get symbols
    return onSymbolResolvedCallback(symbolInfo({ symbol: symbolName, baseAsset: symbolName }));
  },

  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    const { from, to } = periodParams;
    // console.log("[getBars]: Method call", symbolInfo, resolution, from, to);

    try {
      let prices = await getChartPricesFromStats(ARBITRUM, symbolInfo.ticker, supportedResolutions[resolution]);
      if (prices.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }
      let bars = prices.map((bar) => {
        if (bar.time >= from && bar.time < to) {
          return {
            time: bar.time * 1000,
            low: bar.low,
            high: bar.high,
            open: bar.open,
            close: bar.close,
          };
        }
        return bar;
      });
      // console.log(`[getBars]: returned ${bars.length} bar(s)`);
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      // console.log("[getBars]: Get error", error);
      onErrorCallback(error);
    }
  },
  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
    // console.log("=====subscribeBars runnning");
  },
  unsubscribeBars: (subscriberUID) => {
    // console.log("=====unsubscribeBars running");
  },
  calculateHistoryDepth: (resolution, resolutionBack, intervalBack) => {
    //optional
    // console.log("=====calculateHistoryDepth running");
    // while optional, this makes sure we request 24 hours of minute data at a time
    // CryptoCompare's minute data endpoint will throw an error if we request data beyond 7 days in the past, and return no data
    return resolution < 60 ? { resolutionBack: "D", intervalBack: "1" } : undefined;
  },
  getMarks: (symbolInfo, startDate, endDate, onDataCallback, resolution) => {
    //optional
    // console.log("=====getMarks running");
  },
  getTimeScaleMarks: (symbolInfo, startDate, endDate, onDataCallback, resolution) => {
    //optional
    // console.log("=====getTimeScaleMarks running");
  },
  getServerTime: (cb) => {
    // console.log("=====getServerTime running");
  },
};

export default Datafeed;
